const elAddress = document.getElementById('address')
const elResults = document.getElementById('results')

elAddress.focus()

const urlLookup = address => `https://maps.bouldercolorado.gov/arcgis/rest/services/pds/AddressSearch/MapServer/1/query?f=json&where=ADDRESS%20LIKE%20%27${encodeURIComponent(address).toUpperCase()}%25%27&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=OBJECTID%2CASR_ID%2CADDRESS%2COWNER_NAME&orderByFields=address%20ASC`

const urlParcelSummary = id => 'https://secure.ci.boulder.co.us/CrystalSlim3/servlet/ViewReport?reportType=html&reportName=ParcelSummary&ParcelNo=' + id

const urlZillow = address => '/zillow/' + encodeURIComponent(address)

const print = s => elResults.innerHTML = s || ''
const clear = () => elResults.innerHTML = ''
const append = s => elResults.innerHTML += '<br>' + s || ''

let state = {}

const printProperty = () => {
  console.log(state.zillow)
  clear()
  append('<b>Address: </b> ' + state.attr.ADDRESS)
  append('<b>Owner: </b>' + state.attr.OWNER_NAME)
  append('<b>Zoning: </b> ' + state.zoning)

  if (state.zillow) {
    append('<b>Estimate: </b> ' + numeral(state.zillow.zestimate.amount.$t).format('$0,0.00'))
  }

  append(`<p class="smaller">
  <a href="${urlParcelSummary(state.attr.ASR_ID)}" target="_blank">Parcel Summary</a>` +
  (state.zillow ? `<br><a href="${state.zillow.links.homedetails}" target="_blank">Zillow</a>` : '') +
  '</p>')
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
  state = {}

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

      state.attr = result.features[0].attributes
      state.zoning = 'Thinking... 🤔'
      printProperty()

      // get zillow info
      fetch(urlZillow(state.attr.ADDRESS))
        .then(res => res.json())
        .then(zillow => {
          state.zillow = zillow
          printProperty()
        })
        .catch(err => {
          console.error('ERROR', err)
          print('Error 😔')
        })

      // get parcel summary
      fetch('/proxy/' + encodeURIComponent(urlParcelSummary(state.attr.ASR_ID)))
        .then(res => res.text())
        .then(text => {
          // only show the result if the nonce is current; this ensures that only the latest fetch is shown
          if (nonce === currentNonce) {
            state.zoning = (
              text.match(/public/i) ? '🏛 ' :
              text.match(/downtown/i) ? '🏪 ' :
              text.match(/business/i) ? '🏦 ' :
              text.match(/mixed/i) ? '🏘 ' :
              text.match(/residential/i) ? '🏡 ' :
              ''
            ) + text
            printProperty()
          }
        })
        .catch(err => {
          console.error('ERROR', err)
          print('Error 😔')
        })
    })
}, 300))
