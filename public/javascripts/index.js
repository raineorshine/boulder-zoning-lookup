const elAddress = document.getElementById('address')
const elResults = document.getElementById('results')

elAddress.focus()

const urlLookup = address => `https://maps.bouldercolorado.gov/arcgis/rest/services/pds/AddressSearch/MapServer/1/query?f=json&where=ADDRESS%20LIKE%20%27${encodeURIComponent(address).toUpperCase()}%25%27&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=OBJECTID%2CASR_ID%2CADDRESS%2COWNER_NAME&orderByFields=address%20ASC`

const urlParcelSummary = id => 'https://secure.ci.boulder.co.us/CrystalSlim3/servlet/ViewReport?reportType=html&reportName=ParcelSummary&ParcelNo=' + id

const urlZillow = address => '/zillow/' + encodeURIComponent(address)
const urlZillowImage = zpid => '/zillow-image/' + zpid

const print = s => elResults.innerHTML = s || ''
const clear = () => elResults.innerHTML = ''
const append = s => elResults.innerHTML += '<br>' + s || ''

let state = {}

const printProperty = () => {
  clear()
  append('<b>Address: </b> ' + state.attr.ADDRESS)
  append('<b>Owner: </b>' + state.attr.OWNER_NAME)

  if (state.zillow) {
    append('<b>Estimate: </b> ' + numeral(state.zillow.zestimate.valuationRange.low.$t).format('$0,0') + '-' + numeral(state.zillow.zestimate.valuationRange.high.$t).format('$0,0'))
  }

  append('<b>Zoning: </b> ' + state.zoning)

  append(`<p class="smaller">
  <a href="${urlParcelSummary(state.attr.ASR_ID)}" target="_blank">Parcel Summary</a>` +
  (state.zillow ? `<br><a href="${state.zillow.links.homedetails}" target="_blank">Zillow</a>` : '') +
  '</p>')

  if (state.image) {
    append(`<img src="${state.image}">`)
  }
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
          if (nonce === currentNonce) {
            state.zillow = zillow
            printProperty()

            // get zillow image
            fetch(urlZillowImage(zillow.zpid))
              .then(res => res.status !== 200 ? res.text() : null)
              .then(url => {
                if (nonce === currentNonce && url) {
                  state.image = url
                }
              })
              .catch(console.error)
          }
        })
        // ignore zillow errors; it may not exist

      // get parcel summary
      fetch('/proxy/' + encodeURIComponent(urlParcelSummary(state.attr.ASR_ID)))
        .then(res => res.text())
        .then(text => {
          // only show the result if the nonce is current; this ensures that only the latest fetch is shown
          if (nonce === currentNonce) {
            state.zoning = text && text !== '/' ? (
              text.match(/public/i) ? '🏛 ' :
              text.match(/downtown/i) ? '🏪 ' :
              text.match(/business/i) ? '🏦 ' :
              text.match(/mixed/i) ? '🏘 ' :
              text.match(/residential/i) ? '🏡 ' :
              ''
            ) + text : 'N/A'
            printProperty()
          }
        })
        .catch(err => {
          console.error('ERROR', err)
          print('Error 😔')
        })
    })
}, 300))
