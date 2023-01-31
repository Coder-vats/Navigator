import { useRef, useEffect, useState } from 'react'
import * as tt from '@tomtom-international/web-sdk-maps'
import * as ttapi from '@tomtom-international/web-sdk-services'
import './App.css'
import '@tomtom-international/web-sdk-maps/dist/maps.css'
import { FaMapMarkerAlt } from "react-icons/fa";
import { REACT_APP_TOM_TOM_API_KEY, REACT_APP_OW_API_KEY } from "./api.js";



const App = () => {
  const mapElement = useRef()
  const [map, setMap] = useState({})
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [latitude, setLatitude] = useState(29.2183)
  const [longitude, setLongitude] = useState(79.5130)




  async function axio(e) {

    e.preventDefault();

    const url = ` https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=5&appid=${REACT_APP_OW_API_KEY}`;
    await fetch(url)
      .then(res => res.json())
      .then(result => {
        console.log(result);
        if (!state) {
          setLatitude(result[0].lat);
          setLongitude(result[0].lon);
        }
        else {
          const filteredResult = result.filter(res => res.state.toLowerCase() === state.toLowerCase())
          setLatitude(filteredResult[0].lat);
          setLongitude(filteredResult[0].lon);
        }


      }).catch((error) => { console.log(error) });
  }



  const convertToPoints = (lngLat) => {
    return {
      point: {
        latitude: lngLat.lat,
        longitude: lngLat.lng
      }
    }
  }

  const drawRoute = (geoJson, map) => {
    if (map.getLayer('route')) {
      map.removeLayer('route')
      map.removeSource('route')
    }
    map.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: geoJson
      },
      paint: {
        'line-color': '#4a90e2',
        'line-width': 6

      }
    })
  }

  const addDeliveryMarker = (lngLat, map) => {
    const element = document.createElement('div')
    element.className = 'marker-delivery'
    new tt.Marker({
      element: element
    })
      .setLngLat(lngLat)
      .addTo(map)
  }

  useEffect(() => {
    const origin = {
      lng: longitude,
      lat: latitude,
    }
    const destinations = []

    let map = tt.map({
      key: REACT_APP_TOM_TOM_API_KEY,
      container: mapElement.current,
      stylesVisibility: {
        trafficIncidents: true,
        trafficFlow: true,
      },
      center: [longitude, latitude],
      zoom: 14,
    })
    setMap(map)

    const addMarker = () => {
      const popupOffset = {
        bottom: [0, -25]
      }
      const popup = new tt.Popup({ offset: popupOffset }).setHTML('This is you!')
      const element = document.createElement('div')
      element.className = 'marker'

      const marker = new tt.Marker({
        draggable: true,
        element: element,
      })
        .setLngLat([longitude, latitude])
        .addTo(map)

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat()
        setLongitude(lngLat.lng)
        setLatitude(lngLat.lat)
      })

      marker.setPopup(popup).togglePopup()

    }
    addMarker()

    const sortDestinations = (locations) => {
      const pointsForDestinations = locations.map((destination) => {
        return convertToPoints(destination)
      })
      const callParameters = {
        key: REACT_APP_TOM_TOM_API_KEY,
        destinations: pointsForDestinations,
        origins: [convertToPoints(origin)],
      }

      return new Promise((resolve, reject) => {
        ttapi.services.matrixRouting(callParameters).then((matrixAPIResults) => {
          const results = matrixAPIResults.matrix[0]
          const resultsArray = results.map((result, index) => {
            return {
              location: locations[index],
              drivingtime: result.response.routeSummary.travelTimeInSeconds,
            }
          })
          resultsArray.sort((a, b) => {
            return a.drivingtime - b.drivingtime
          })
          const sortedLocations = resultsArray.map((result) => {
            return result.location
          })
          resolve(sortedLocations)
        })
      })
    }

    const recalculateRoutes = () => {
      sortDestinations(destinations).then((sorted) => {
        sorted.unshift(origin)

        ttapi.services
          .calculateRoute({
            key: REACT_APP_TOM_TOM_API_KEY,
            locations: sorted,
          })
          .then((routeData) => {
            const geoJson = routeData.toGeoJson()
            drawRoute(geoJson, map)
          })
      })
    }


    map.on('click', (e) => {
      destinations.push(e.lngLat)
      addDeliveryMarker(e.lngLat, map)
      recalculateRoutes()
    })

    return () => map.remove()
  }, [longitude, latitude])

  return (
    <>
      {map && (
        <div className="app">
          <div ref={mapElement} className="map" />
          <div className="search-bar">
            <h3>Tap to put Destinations <FaMapMarkerAlt /></h3>
            <form className='input' onSubmit={axio}>
              <input
                type="text"
                id="city"
                className="city"
                placeholder="Put in City(required)"
                onChange={(e) => {
                  setCity(e.target.value)
                }}
              />

              <input
                type="text"
                id="state"
                className="state"
                placeholder="Put in State(optional)"
                onChange={(e) => {
                  setState(e.target.value)
                }}
              />

              <button type='submit' className='button'>
                Search
              </button>

            </form>


          </div>
        </div>
      )}
    </>
  )
}

export default App
