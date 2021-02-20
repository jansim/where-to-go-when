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

function getTooltip({object}) {
  if (!object) {
    return null;
  }

  return JSON.stringify(object);
}

const colorCategories = {
  camping: [228,26,28],
  city: [55,126,184],
  do: [77,175,74],
  go: [152,78,163],
  see: [255,255,51],
  other: [255,127,0]
};

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
    getColor: (d) => {
      if (d.cat in colorCategories) {
        return colorCategories[d.cat]
      } else {
        // Unmatched
        return [255, 0, 0]
      }
    },
    getIcon: d => 'marker',
    // getPixelOffset: [0, 0],
    getPosition: d => [Number(d.lon || d.lng), Number(d.lat)],
    iconAtlas: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png',
    iconMapping: {
      marker: {
        x: 0,
        y: 0,
        width: 128,
        height: 128,
        anchorY: 128,
        mask: true
      }
    },
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
