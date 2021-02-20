import React, {useState} from 'react';
import {render} from 'react-dom';
import {StaticMap} from 'react-map-gl';
import {AmbientLight, PointLight, LightingEffect} from '@deck.gl/core';
import {HexagonLayer} from '@deck.gl/aggregation-layers';
import {IconLayer} from '@deck.gl/layers';
import DeckGL from '@deck.gl/react';

// Source data CSV
const DATA_URL = 'data_cleaned/wiki_voyage.csv';
// const DATA_URL = 'data_cleaned/heatmap-data.csv';
// const DATA_URL = 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/3d-heatmap/heatmap-data.csv'; // eslint-disable-line

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

const colorCategories = {
  camping: [228,26,28],
  city: [55,126,184],
  do: [77,175,74],
  go: [152,78,163],
  see: [255,255,51],
  other: [255,127,0]
};

const fallbackIcon = "see"
const iconMapping = [
  {},
  "see", "city", "camping", "climbing", "do"
].reduce((map, value, index) => {
  map[value] = {
    x: (index - 1) * 160,
    y: 0,
    width: 160,
    height: 160
  }
  return map
})

/* eslint-disable react/no-deprecated */
export default function App({
  data,
  mapStyle = MAP_STYLE,
  radius = 5000,
  upperPercentile = 100,
  coverage = 1
}) {
  const [viewState, setViewState] = useState({
    longitude: -1.415727,
    latitude: 52.232395,
    zoom: 3.5,
    minZoom: 1,
    maxZoom: 15,
    pitch: 40.5,
    bearing: 0
  });

  const zoomedIn = viewState.zoom > 6

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
        output += `\n${key}: ${cat_counts[key]}`
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

    visible: !zoomedIn,

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
    visible: zoomedIn,

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
    <DeckGL
      layers={layers}
      effects={[lightingEffect]}
      initialViewState={viewState}
      onViewStateChange={e => setViewState(e.viewState)}
      controller={true}
      getTooltip={getTooltip}
    >
      <StaticMap reuseMaps mapStyle={mapStyle} preventStyleDiffing={true} />
    </DeckGL>
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
