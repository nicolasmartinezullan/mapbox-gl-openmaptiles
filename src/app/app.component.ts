import { Component, OnInit } from '@angular/core';
import * as mapboxgl from 'mapbox-gl/dist/mapbox-gl.js';
// import { GeoCoordinate } from 'geocoordinate';
// var mapboxgl = require('mapbox-gl/dist/mapbox-gl.js');
import { environment } from '../environments/environment';
// import layer from './layer';
import turfCircle from '@turf/circle';
import {
  point as turfPoint,
  polygon as turfPolygon,
} from '@turf/helpers';

const turf = {
  circle: turfCircle,
  point: turfPoint,
  polygon: turfPolygon,
};

interface Drone {
  name: string;
  color: string;
  AOA: number;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit {
  map;
  center = [-86, 36]; // [lng, lat]
  availableColors: string[] = ['blueviolet', 'orangered', 'yellowgreen'];

  ngOnInit() {
    this.startOffline();
    // this.startOnline();
  }

  startOffline() {

    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-86.032, 36.913],
          },
          properties: {
            title: 'Mapbox',
            description: 'Washington, D.C.',
          },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [-86.414, 36.776],
          },
          properties: {
            title: 'Mapbox',
            description: 'San Francisco, California',
          },
        },
      ],
    };

    // http://localhost:5677/styles/klokantech-basic/style.json

    const baseUrl = `http://localhost:5677`;
    const style =
      // 'osm-bright';
      `klokantech-basic`;
    const styleUrl =
      'https://openmaptiles.github.io/' + style + '-gl-style/style-cdn.json';
    //  baseUrl + '/styles/' + style + '/style.json';

    this.map = new mapboxgl.Map({
      container: 'map',
      style: styleUrl,
      center: this.center,
      zoom: 14,
      // hash: true,
      // pitchWithRotate: false,
      // dragRotate: false,
      // bearing: 29,
      // pitch: 50,
    });

    this.map.addControl(new mapboxgl.NavigationControl());

    this.map.on('load', () => this.onMapLoad());
  }

  onMapLoad() {
    this.addAntennaMarker();

    // this.addCircleManual();
    this.addCircleTurf();

    this.addPolygons();
  }

  get randomColor() {
    const color = this.availableColors.shift();
    return color;
  }

  addPolygons() {
    const drones: Drone[] = [
      { name: 'drone-1', color: this.randomColor, AOA: 40.123456 },
      { name: 'drone-2', color: this.randomColor, AOA: 60.123456 },
      { name: 'drone-3', color: this.randomColor, AOA: 80.123456 },
    ];
    drones.forEach(drone => this.addPolygon(drone));
  }

  pointAtDistance(distance: number, bearing: number) {
    const D2R = Math.PI / 180.0;
    const R = 6376500;
    const latitudeRadians = this.latitude() * D2R;
    const longitudeRadians = this.longitude() * D2R;
    const lat2 = Math.asin(
      Math.sin(latitudeRadians) * Math.cos(distance / R) +
        Math.cos(latitudeRadians) * Math.sin(distance / R) * Math.cos(bearing)
    );
    const lon2 =
      longitudeRadians +
      Math.atan2(
        Math.sin(bearing) * Math.sin(distance / R) * Math.cos(latitudeRadians),
        Math.cos(distance / R) - Math.sin(latitudeRadians) * Math.sin(lat2)
      );
    return [lon2 / D2R, lat2 / D2R];
    // return new GeoCoordinate([lat2 / D2R, lon2 / D2R]);
  }

  longitude() {
    return this.center[0];
  }

  latitude() {
    return this.center[1];
  }

  addPolygon(drone: Drone) {
    // const center = new GeoCoordinate(
    //   this.center
    // {
    //   latitude: this.center[0],
    //   longitude: this.center[1],
    // }
    // );

    const coord1 = this.pointAtDistance(
      1000,
      ((drone.AOA - 7) * Math.PI) / 180
    );
    const coord2 = this.pointAtDistance(
      1000,
      ((drone.AOA + 7) * Math.PI) / 180
    );

    // console.log(
    //   this.center,
    //   coord1._coordinate,
    //   coord2._coordinate,
    //   this.center
    // );

    const feature = turf.polygon([
      [this.center, coord1, coord2, this.center],
    ]);

    const geojson = {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [feature],
      },
    };
    this.map.addSource(drone.name, geojson);
    this.map.addLayer({
      id: drone.name,
      type: 'fill',
      source: drone.name,
      layout: {},
      paint: {
        'fill-color': drone.color, // 'rgba(189, 189, 189, 1)',
        'fill-opacity': 0.8, // 0.5,
      },
    });

    // const triangle = L.polygon(
    //   [
    //     this.center,
    //     coord1._coordinate,
    //     coord2._coordinate,
    //   ],
    //   {
    //     color: color,
    //     fillColor: color,
    //     weight: 2,
    //   }
    // ).addTo(this.map);
  }

  addAntennaMarker() {
    const el = document.createElement('div');
    el.className = 'marker';
    new mapboxgl.Marker(el).setLngLat(this.center).addTo(this.map);
  }

  addCircleManual() {
    const createGeoJSONCircle = (center, radiusInKm, points = 64) => {
      const coords = {
        longitude: center[0],
        latitude: center[1],
      };

      const coordinates = [];
      const distanceX =
        radiusInKm / (111.32 * Math.cos((coords.latitude * Math.PI) / 180));
      const distanceY = radiusInKm / 110.574;

      let theta, x, y;
      for (let i = 0; i < points; i++) {
        theta = (i / points) * (2 * Math.PI);
        x = distanceX * Math.cos(theta);
        y = distanceY * Math.sin(theta);
        coordinates.push([coords.longitude + x, coords.latitude + y]);
      }
      coordinates.push(coordinates[0]);
      const feature = turf.circle(this.center, 1, {
        steps: 64,
        units: 'kilometers',
      });
      return {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            feature,
            // {
            //   type: 'Feature',
            //   geometry: {
            //     type: 'Polygon',
            //     coordinates: [coordinates],
            //   },
            // },
          ],
        },
      };
    };

    const geoJsonCircle = createGeoJSONCircle(this.center, 1);
    // const turfCircle = turf.circle(this.center, 1, {steps: 64, units: 'kilometers'});
    // console.log('turfCircle', turfCircle, 'geoJsonCircle', geoJsonCircle);
    this.map.addSource('gimble_area', geoJsonCircle);

    this.map.addLayer({
      id: 'gimble_area',
      type: 'fill',
      source: 'gimble_area',
      layout: {},
      paint: {
        'fill-color': 'gray',
        'fill-opacity': 0.2,
      },
    });

    setTimeout(() => {
      // const newCircle = createGeoJSONCircle(this.center, 2).data;
      // this.map
      //   .getSource('gimble_area')
      //   .setData(newCircle);
    }, 3000);
  }

  addCircleTurf() {
    const feature = turf.circle(
      this.center,
      1 /*, { units: 'kilometers', steps: 64}*/
    );
    const geojson = {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [feature],
      },
    };
    this.map.addSource('gimble_area', geojson);
    this.map.addLayer({
      id: 'gimble_area',
      type: 'fill',
      source: 'gimble_area',
      layout: {},
      paint: {
        'fill-color': 'gray', // 'rgba(189, 189, 189, 1)',
        'fill-opacity': 0.2, // 0.5,
      },
    });
    // setTimeout(() => {
    //   const data = {
    //     type: 'FeatureCollection',
    //     features: [turf.circle(this.center, 2)],
    //   };
    //   this.map.getSource('gimble_area').setData(data);
    // }, 3000);
  }

  startOnline() {
    mapboxgl.accessToken = environment.mapbox.accessToken;

    const map = new mapboxgl.Map({
      container: 'map',
      //   style: 'mapbox://styles/mapbox/streets-v10',
      // style: 'https://openmaptiles.github.io/osm-bright-gl-style/style-cdn.json',
      style:
        'https://openmaptiles.github.io/klokantech-basic-gl-style/style-cdn.json',
      center: [8.5456, 47.3739],
      zoom: 11,
    });

    // map.on('load', function() {
    //   // Add a layer showing the places.
    //   map.addLayer(layer);

    //   // When a click event occurs on a feature in the places layer, open a popup at the
    //   // location of the feature, with description HTML from its properties.
    //   map.on('click', 'places', function(e) {
    //     const coordinates = e.features[0].geometry.coordinates.slice();
    //     const description = e.features[0].properties.description;

    //     // Ensure that if the map is zoomed out such that multiple
    //     // copies of the feature are visible, the popup appears
    //     // over the copy being pointed to.
    //     while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
    //       coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
    //     }

    //     new mapboxgl.Popup()
    //       .setLngLat(coordinates)
    //       .setHTML(description)
    //       .addTo(map);
    //   });

    //   // Change the cursor to a pointer when the mouse is over the places layer.
    //   map.on('mouseenter', 'places', function() {
    //     map.getCanvas().style.cursor = 'pointer';
    //   });

    //   // Change it back to a pointer when it leaves.
    //   map.on('mouseleave', 'places', function() {
    //     map.getCanvas().style.cursor = '';
    //   });
    // });
  }
}
