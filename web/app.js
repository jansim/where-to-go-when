import React, {useState} from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import {AmbientLight, PointLight, LightingEffect} from '@deck.gl/core';
import {HexagonLayer} from '@deck.gl/aggregation-layers';
import {IconLayer} from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';

import "./style.css";

// Source data CSV
const DATA_URL = 'data_cleaned/combined_activities.csv';
// const DATA_URL = 'data_cleaned/heatmap-data.csv';
// const DATA_URL = 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/3d-heatmap/heatmap-data.csv'; // eslint-disable-line

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
    label: "Climbing"
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
    height: 160
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

// Create state for checkboxes
const category_state = {}
categories.map(cat => {
  category_state[cat.id] = true
})

/* eslint-disable react/no-deprecated */
export default function App({
  data,
  mapStyle = MAP_STYLE,
  radius = 5000,
  upperPercentile = 100,
  coverage = 1
}) {
  const [state, setState] = useState({
    zoomedIn: INITIAL_VIEW_STATE.zoom > ZOOMED_IN_THRESHOLD,
    ...category_state
  })

  function handleInputChange(event) {
    const target = event.target;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const name = target.name;
    setState({ [name]: value });
  }

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
      let output = `${agg_count} points.\n`
      Object.keys(cat_counts).map(function(key, index) {
        output += `\n${emojis[key] || key}: ${cat_counts[key]}`
      })
      return output
    } else {
      let output = `${object.title}\n`
      if (object.phone) {
        output += `\ntel: ${object.phone}`
      }
      if (object.url) {
        output += `\nurl: ${object.url}`
      }
      if (object.cat) {
        output += `\ncategory: ${object.cat}`
      }
      return output
    }
  }

  const hexLayer = new HexagonLayer({
    id: 'heatmap',

    visible: !state.zoomedIn,

    colorRange,
    coverage,
    data,
    elevationRange: [0, 2500],
    elevationScale: data && data.length ? 120 : 0,
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
    data,
    visible: state.zoomedIn,

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

  const layers = [
    hexLayer,
    iconLayer
  ];

  return (
    <div>
      <div className="controls">
        <span>What are you interested in?</span>

        <div>
          {/* {
            categories.map(cat => (
              <label key={`check-${cat.id}`}>
                <input type="checkbox" name={cat.id} checked={state[cat.id]} onChange={handleInputChange}/>
                <span> {`${cat.emoji} ${cat.label}`}</span>
              </label>
            ))
}  */}
            <label>
              <input type="checkbox" name="camping" checked={state['camping']} onChange={handleInputChange}/>
              <span> 🏕️ Camping! </span>
            </label>

            <label>
              <input type="checkbox" name="see" checked={state['see']} onChange={handleInputChange}/>
              <span> ✨ Sightseeing </span>
            </label>

            <label>
              <input type="checkbox" name="ao" checked={state['ao']} onChange={handleInputChange}/>
              <span> 👻 Obscure Sightseeing </span>
            </label>

            <label>
              <input type="checkbox" name="do" checked={state['do']} onChange={handleInputChange}/>
              <span> 🏃 Activities </span>
            </label>

            <label>
              <input type="checkbox" name="climbing" checked={state['climbing']} onChange={handleInputChange}/>
              <span> 🧗 Climbing </span>
            </label>

            <label>
              <input type="checkbox" name="city" checked={state['city']} onChange={handleInputChange}/>
              <span> 🏙️ City trips </span>
            </label>
        </div>
      </div>

      <DeckGL
        layers={layers}
        effects={[lightingEffect]}
        initialViewState={INITIAL_VIEW_STATE}
        onViewStateChange={e => {
          setState({zoomedIn: e.viewState.zoom > ZOOMED_IN_THRESHOLD})
        }}
        controller={true}
        getTooltip={getTooltip}
      >
        <StaticMap reuseMaps mapStyle={mapStyle} preventStyleDiffing={true} />
      </DeckGL>
    </div>
  );
}

export function renderToDOM(container) {
  render(<App />, container);

  require('d3-request').csv(DATA_URL, (error, response) => {
    if (!error) {
      const data = response;
      render(<App data={data} />, container);
    } else {
      console.error(error)
    }
  });
}
