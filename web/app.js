import React, {useState} from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import {AmbientLight, PointLight, LightingEffect} from '@deck.gl/core';
import {HexagonLayer} from '@deck.gl/aggregation-layers';
import {IconLayer} from '@deck.gl/layers';
import {H3HexagonLayer} from '@deck.gl/geo-layers';
import DeckGL from '@deck.gl/react';
import {scaleLinear} from 'd3-scale';
import { csv } from 'd3-fetch'

import "./style.css";

// Source data CSV
const DATA_URL = 'data_cleaned/combined_activities.csv';
// const DATA_URL = 'data_cleaned/heatmap-data.csv';
// const DATA_URL = 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/3d-heatmap/heatmap-data.csv'; // eslint-disable-line

const DATA_SOURCES = {
  camping: 'camping.csv',
  see: 'see.csv',
  ao: 'ao.csv',
  do: 'do.csv',
  climbing: 'climbing.csv',
  city: 'city.csv'
}
const DATA_DIRECTORY = 'data_cleaned/split/'

const categories = [
  {
    id: "camping",
    emoji: "🏕️",
    label: "Camping!"
  },
  {
    id: "see",
    emoji: "✨",
    label: "Sightseeing"
  },
  {
    id: "ao",
    emoji: "👻",
    label: "Obscure Sightseeing"
  },
  {
    id: "do",
    emoji: "🏃",
    label: "Activities"
  },
  {
    id: "climbing",
    emoji: "🧗",
    label: "Climbing (US)"
  },
  {
    id: "city",
    emoji: "🏙️",
    label: "City trips"
  }
]
const labels = {}
categories.map(cat => {
  labels[cat.id] = cat.label
})
const emojis = {}
categories.map(cat => {
  emojis[cat.id] = cat.emoji
})

// Average temperatures are generally lower here,
// as they also factor in nighttime!
const temperatureModes = [
  {
    id: "absolute",
    type: "absolute",
    label: "🌡️ I like it exact"
  },
  {
    id: "rel_warm",
    type: "relative",
    targetAvgTemp: 19,
    label: "☀️ I like it warm"
  },
  {
    id: "rel_hot",
    type: "relative",
    targetAvgTemp: 25,
    label: "🏖️ I like it hot"
  },
  {
    id: "rel_cold",
    type: "relative",
    targetAvgTemp: 0,
    label: "🏂️ I like it icy"
  }
]

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0
});

const pointLight1 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-0.144528, 49.739968, 80000]
});

const pointLight2 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-3.807751, 54.104682, 8000]
});

const lightingEffect = new LightingEffect({ambientLight, pointLight1, pointLight2});

const material = {
  ambient: 0.64,
  diffuse: 0.6,
  shininess: 32,
  specularColor: [51, 51, 51]
};

// const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json';
const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

export const colorRange = [
  [1, 152, 189],
  [73, 227, 206],
  [216, 254, 181],
  [254, 237, 177],
  [254, 173, 84],
  [209, 55, 78]
];

const fallbackIcon = "see"
const iconMapping = [
  {},
  "see", "city", "camping", "climbing", "do", "ao"
].reduce((map, value, index) => {
  map[value] = {
    x: (index - 1) * 160,
    y: 0,
    width: 160,
    height: 160,
    anchorY: 160
  }
  return map
})

const INITIAL_VIEW_STATE = {
  longitude: -1.415727,
  latitude: 52.232395,
  zoom: 3.5,
  minZoom: 1,
  maxZoom: 15,
  pitch: 40.5,
  bearing: 0
};

const ZOOMED_IN_THRESHOLD = 7
const mapStyle = MAP_STYLE
const radius = 5000
const upperPercentile = 100
const coverage = 1

const months = ["jan", "feb", "mar", "apr", "may", "june", "july", "aug", "sep", "oct", "nov", "dec"]
const pretty_months = ["January ❄️", "February 🧑‍💻", "March 🌱", "April ☔️", "May 🐝", "June 🌼", "July 🔥", "August 🌞", "September 🌇", "October 🍂", "November 🥧", "December 🎅"]

// Create state for checkboxes
const category_state = {}
const DISABLED_CATEGORIES = ['climbing', 'camping', 'ao']
categories.map(cat => {
  category_state[cat.id] = !DISABLED_CATEGORIES.includes(cat.id)
})

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      month: (new Date).getMonth(),
      datasets: {},
      loadingDatasets: [],
      data: null,
      zoomedIn: INITIAL_VIEW_STATE.zoom > ZOOMED_IN_THRESHOLD,
      temp_mode: temperatureModes[0].id,
      ...category_state
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.last_state = {}

    this.filterData = this.filterData.bind(this);
    this.updateDatasets = this.updateDatasets.bind(this);
  }

  componentDidMount() {
    // Load data
    this.updateDatasets()
  }

  handleInputChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;

    this.setState({
      [name]: value
    }, () => {
      // Update datasets after state has been updated
      this.updateDatasets()
      this.filterData()
    });
  }

  async updateDatasets () {
    for (const [key, value] of Object.entries(DATA_SOURCES)) {

      // Check whether this dataset is active
      if (this.state[key]) {
        // Check whether data is not yet loaded or not currently loading?
        if (!(key in this.state.datasets) && !this.state.loadingDatasets[key]) {
          // Mark this dataset as currently loading
          let loadingDatasets = { ...this.state.loadingDatasets }
          loadingDatasets[key] = true
          this.setState({ loadingDatasets })

          // Wait for data to come in
          const new_data = await csv(DATA_DIRECTORY + value)
          const datasets = { ...this.state.datasets }
          datasets[key] = new_data

          loadingDatasets = { ...this.state.loadingDatasets }
          loadingDatasets[key] = false

          // Update state with new objects, to deal with react weirdness
          this.setState({ loadingDatasets, datasets })

          this.filterData()
        }
      }
    }
  }

  filterData () {
    // Set this to true from the beginning, when data is not yet loaded!
    let changed = !this.state.data
    categories.map(cat => {
      if (this.state[cat.id] !== this.last_state[cat.id] && this.state.datasets[cat.id]) {
        changed = true
        this.last_state[cat.id] = this.state[cat.id]
      }
    })

    if (changed) {
      let combined_data = []

      for (const [key, dataset] of Object.entries(this.state.datasets)) {
        if (this.state[key]) {
          combined_data = combined_data.concat(dataset)
        }
      }

      this.setState({data: combined_data})
    }
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    this.filterData()
  }

  render() {
    let month_short = months[this.state.month]
    function getTooltip({object}) {
      if (!object) {
        return null;
      }

      if (object.points) {
        let cat_counts = {}
        let agg_count = 0
        object.points.map(value => {
          agg_count++
          let cat = value && value.source && value.source.cat
          cat_counts[cat] = (cat_counts[cat] || 0) + 1
        })
        let output = `${agg_count} 📍\n`
        Object.keys(cat_counts).map(function(key, index) {
          output += `\n${emojis[key] || key}: ${cat_counts[key]}`
        })
        return output
      } else {
        let output = ''
        if (object.title) {
          output += `${object.title}`
        }
        if (object.description) {
          output += `\n${object.description}`
        }
        if (object.cat && labels[object.cat]) {
          output += `\nCategory: ${labels[object.cat]}`
        }
        if (object[month_short]) {
          output += `🌡️: ${object[month_short + '_min']} to ${object[month_short + '_max']} °C (avg: ${parseInt(object[month_short])} °C)`
        }
        return output
      }
    }

    const hexLayer = new HexagonLayer({
      id: 'heatmap',

      visible: !this.state.zoomedIn,

      colorRange,
      coverage,
      data: this.state.data,
      elevationRange: [0, 2500],
      elevationScale: this.state.data && this.state.data.length ? 120 : 0,
      extruded: true,
      getPosition: d => [Number(d.lon || d.lng), Number(d.lat)],
      pickable: true,
      radius,
      upperPercentile,
      material,

      transitions: {
        elevationScale: 2500
      }
    })

    const iconLayer = new IconLayer({
      id: 'IconLayer',
      data: this.state.data,
      visible: this.state.zoomedIn,

      /* props from IconLayer class */

      // alphaCutoff: 0.05,
      // billboard: true,
      // getAngle: 0,
      // getColor: (d) => {
      //   if (d.cat in colorCategories) {
      //     return colorCategories[d.cat]
      //   } else {
      //     // Unmatched
      //     return [255, 0, 0]
      //   }
      // },
      getIcon: d => {
        if (d.cat in iconMapping) {
          return d.cat
        } else {
          console.warn("Unsupported icon type", d.cat)
          return fallbackIcon
        }
      },
      // getPixelOffset: [0, 0],
      getPosition: d => [Number(d.lon || d.lng), Number(d.lat)],
      iconAtlas: 'img/category_icons.png',
      iconMapping,
      sizeScale: 2000,
      sizeUnits: 'meters',
      pickable: true,
      sizeMinPixels: 10,
      sizeMaxPixels: 60
    });

    const active_temp_mode = temperatureModes.filter(mode => mode.id === this.state.temp_mode)[0]
    const absoluteTemperatureColorScale = scaleLinear()
      .domain([
        -20,
        0,
        10,
        20,
        30,
        50
      ])
      .range([
        [49,130,189],
        [158,202,225],
        [222,235,247],
        [255,237,160],
        [254,178,76],
        [240,59,32]
      ]);
    const getFillColorAbsolute = (d) => absoluteTemperatureColorScale(d[months[this.state.month]])
    const relativeTemperatureColorScale = scaleLinear()
      .domain([
        60,
        40,
        10,
        5,
        0
      ])
      .range([
        [215,25,28],
        [253,174,97],
        [255,255,191],
        [166,217,106],
        [26,150,65]
      ]);
    const optimalTemperature = active_temp_mode.targetAvgTemp
    const getFillColorRelative = (d) => relativeTemperatureColorScale(Math.abs(optimalTemperature - d[months[this.state.month]]))

    const getFillColor = active_temp_mode.type === 'absolute' ? getFillColorAbsolute : getFillColorRelative
    const h3Layer = new H3HexagonLayer({
      id: 'coverage',
      data: 'data_cleaned/avg_temp_2020_h3.json',
      getHexagon: d => d.hex,
      stroked: false,
      extruded: false,
      pickable: true,
      getFillColor,
      opacity: 0.1,
      updateTriggers: {
        getFillColor: [this.state.month, this.state.temp_mode]
      }
    });

    const layers = [
      h3Layer,
      hexLayer,
      iconLayer
    ];

    return (
      <div>
        <div className="controls">
          <span>What are you interested in?</span>

          <div>
            {
              categories.map(cat => (
                <label key={`check-${cat.id}`}>
                  <input type="checkbox" name={cat.id} checked={this.state[cat.id]} onChange={this.handleInputChange}/>
                  <span> {`${cat.emoji} ${this.state.loadingDatasets[cat.id] ? 'loading..' : cat.label}`}</span>
                </label>
              ))
            }
          </div>

          <br/>

          <div>
            {
              temperatureModes.map(mode => (
                <label key={`radio-${mode.id}`}>
                  <input type="radio" name="temp_mode" value={mode.id} checked={this.state.temp_mode === mode.id} onChange={this.handleInputChange}/>
                  <span> {`${mode.label}`}</span>
                </label>
              ))
            }
          </div>

          <br/>

          <label>
            Month: {pretty_months[this.state.month]} <br/>
            <input type="range" id="month" name="month" min="0" max="11" value={this.state["month"]} onChange={this.handleInputChange}/>
          </label>
        </div>

        <DeckGL
          layers={layers}
          effects={[lightingEffect]}
          initialViewState={INITIAL_VIEW_STATE}
          onViewStateChange={e => {
            this.setState({zoomedIn: e.viewState.zoom > ZOOMED_IN_THRESHOLD})
          }}
          controller={true}
          getTooltip={getTooltip}
        >
          <StaticMap reuseMaps mapStyle={mapStyle} preventStyleDiffing={true} />
        </DeckGL>
      </div>
    );
  }
}
export default App

export function renderToDOM(container) {
  render(<App />, container)
}
