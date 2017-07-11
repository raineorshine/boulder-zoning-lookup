const elAddress = document.getElementById('address')
const elResults = document.getElementById('results')

elAddress.focus()

const urlLookup = address => `https://maps.bouldercolorado.gov/arcgis/rest/services/pds/AddressSearch/MapServer/1/query?f=json&where=ADDRESS%20LIKE%20%27${encodeURIComponent(address).toUpperCase()}%25%27&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=OBJECTID%2CASR_ID%2CADDRESS%2COWNER_NAME&orderByFields=address%20ASC`

const urlParcelSummary = id => 'https://secure.ci.boulder.co.us/CrystalSlim3/servlet/ViewReport?reportType=html&reportName=ParcelSummary&ParcelNo=' + id

const print = s => elResults.innerHTML = s || ''
const clear = () => elResults.innerHTML = ''
const append = s => elResults.innerHTML += '<br>' + s || ''
const printProperty = (attr, zoning) => {
  clear()
  append('<b>Address: </b> ' + attr.ADDRESS)
  append('<b>Owner: </b>' + attr.OWNER_NAME)
  append('<b>Zoning: </b> ' + zoning)
  append(`<p class="smaller"><a href="${urlParcelSummary(attr.ASR_ID)}" target="_blank">Parcel Summary</a></div>`)
}

// use a fetch nonce to only show the latest fetch
let nonce = 0

elAddress.addEventListener('input', _.debounce(() => {

  if (!elAddress.value) {
    clear()
    return
  }

  // copy the nonce to a local variable so that it can be compared later on to know whether this is the latest request
  let currentNonce = ++nonce

  print('Thinking... 🤔')
  fetch(urlLookup(elAddress.value))
    .then(res => res.text())
    .then(text => JSON.parse(text))
    .then(result => {

      if (result.error) {
        console.error('ERROR', result.error)
        print('Error 😔')
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
        print('No matches... 😔')
        return
      }

      const attr = result.features[0].attributes

      printProperty(attr, 'Thinking... 🤔')

      return fetch('/proxy/' + encodeURIComponent(urlParcelSummary(attr.ASR_ID)))
        .then(res => res.text())
        .then(text => {
          // only show the result if the nonce is current; this ensures that only the latest fetch is shown
          if (nonce === currentNonce) {
            const zoning = (
              text.match(/public/i) ? '🏛 ' :
              text.match(/downtown/i) ? '🏪 ' :
              text.match(/business/i) ? '🏦 ' :
              text.match(/mixed/i) ? '🏘 ' :
              text.match(/residential/i) ? '🏡 ' :
              ''
            ) + text
            printProperty(attr, zoning)
          }
        })
        .catch(err => {
          console.error('ERROR', err)
          print('Error 😔')
        })
    })
}, 300))
