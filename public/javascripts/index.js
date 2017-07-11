const elAddress = document.getElementById('address')
const elResults = document.getElementById('results')

elAddress.focus()

const urlLookup = address => `https://maps.bouldercolorado.gov/arcgis/rest/services/pds/AddressSearch/MapServer/1/query?f=json&where=ADDRESS%20LIKE%20%27${encodeURIComponent(address).toUpperCase()}%25%27&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=OBJECTID%2CASR_ID%2CADDRESS%2COWNER_NAME&orderByFields=address%20ASC`

const urlCrystalReport = id => 'https://secure.ci.boulder.co.us/CrystalSlim3/servlet/ViewReport?reportType=html&reportName=ParcelSummary&ParcelNo=' + id

elAddress.addEventListener('input', _.debounce(() => {

  if (!elAddress.value) return

  elResults.innerHTML = ''
  fetch(urlLookup(elAddress.value))
    .then(res => res.text())
    .then(text => JSON.parse(text))
    .then(result => {

      if (result.error) {
        console.log('ERROR', result.error)
        elResults.innerHTML = '😔'
        return
      }

      // e.g. https://maps.bouldercolorado.gov/arcgis/rest/services/pds/AddressSearch/MapServer/1/query?f=json&where=ADDRESS%20LIKE%20%27424%20DEWEY%25%27&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=OBJECTID%2CASR_ID%2CADDRESS%2COWNER_NAME&orderByFields=address%20ASC

      // {
      //   "features": [{
      //     "attributes": {
      //       "OBJECTID": 847728,
      //       "ASR_ID": "0007646",
      //       "ADDRESS": "424 DEWEY AV",
      //       "OWNER_NAME": "RIDGE EMILIA A"
      //     }
      //   }]
      // }

      if (!result.features.length) {
        elResults.innerHTML = 'No matches... 😔'
        return
      }

      return fetch('/proxy/' + encodeURIComponent(urlCrystalReport(result.features[0].attributes.ASR_ID)))
    })
    .then(res => res.text())
    .then(text => {
      console.log(text)
    })
    .catch(console.error)
}, 300))
