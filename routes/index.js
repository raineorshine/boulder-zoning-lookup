const express = require('express')
const fetch = require('isomorphic-fetch')
const Nightmare = require('nightmare')
const router = express.Router()
const config = require('../config.json')
const xml2json = require('xml2json')

const zoningLabelSelector = 'a[href^="https://www.municode.com/library/co/boulder/codes/municipal_code?nodeId="]'
const urlZillowGetSearchResults = address => `http://www.zillow.com/webservice/GetSearchResults.htm?zws-id=${config.zillowApiKey}&address=${address}&citystatezip=Boulder%2C+CO`

router.get('/', (req, res) => {
  res.render('index', { title: 'Boulder Zoning Lookup' })
})

/*
{
  "SearchResults:searchresults": {
    "xsi:schemaLocation": "http://www.zillow.com/static/xsd/SearchResults.xsd http://www.zillowstatic.com/vstatic/df6135e/static/xsd/SearchResults.xsd",
    "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
    "xmlns:SearchResults": "http://www.zillow.com/static/xsd/SearchResults.xsd",
    "request": {
      "address": "1801 YARMOUTH ST",
      "citystatezip": "Boulder, CO"
    },
    "message": {
      "text": "Request successfully processed",
      "code": "0"
    },
    "response": {
      "results": {
        "result": {
          "zpid": "82394160",
          "links": {
            "homedetails": "http://www.zillow.com/homedetails/1801-Yarmouth-Ave-Boulder-CO-80304/82394160_zpid/",
            "graphsanddata": "http://www.zillow.com/homedetails/1801-Yarmouth-Ave-Boulder-CO-80304/82394160_zpid/#charts-and-data",
            "mapthishome": "http://www.zillow.com/homes/82394160_zpid/",
            "comparables": "http://www.zillow.com/homes/comps/82394160_zpid/"
          },
          "address": {
            "street": "1801 Yarmouth Ave",
            "zipcode": "80304",
            "city": "Boulder",
            "state": "CO",
            "latitude": "40.058433",
            "longitude": "-105.274912"
          },
          "zestimate": {
            "amount": {
              "currency": "USD",
              "$t": "918794"
            },
            "last-updated": "07/08/2017",
            "oneWeekChange": {
              "deprecated": "true"
            },
            "valueChange": {
              "duration": "30",
              "currency": "USD",
              "$t": "2370"
            },
            "valuationRange": {
              "low": {
                "currency": "USD",
                "$t": "817727"
              },
              "high": {
                "currency": "USD",
                "$t": "973922"
              }
            },
            "percentile": "0"
          },
          "localRealEstate": {
            "region": {
              "name": "Buena Vista",
              "id": "416111",
              "type": "neighborhood",
              "links": {
                "overview": "http://www.zillow.com/local-info/CO-Boulder/Buena-Vista/r_416111/",
                "forSaleByOwner": "http://www.zillow.com/buena-vista-boulder-co/fsbo/",
                "forSale": "http://www.zillow.com/buena-vista-boulder-co/"
              }
            }
          }
        }
      }
    }
  }
}
*/

router.get('/zillow/:address', (req, res) => {
  fetch(urlZillowGetSearchResults(req.params.address))
    .then(res => res.text())
    .then(xml => {
      const json = JSON.parse(xml2json.toJson(xml))
      res.send(json['SearchResults:searchresults'].response.results.result)
    })
    .catch((error) => {
      console.error('ERROR:', error)
      res.status(500).send()
    })
})

router.get('/proxy/:url', (req, res) => {
  const nightmare = Nightmare()

  nightmare
    .goto(decodeURIComponent(req.params.url))
    // .type('#search_form_input_homepage', 'github nightmare')
    // .click('#search_button_homepage')
    .wait(zoningLabelSelector)
    .evaluate(function (zoningLabelSelector) {
      const elZoning = document.querySelector(zoningLabelSelector)
      // traverse from Zoning label to value
      return elZoning.parentNode.parentNode.parentNode.parentNode.nextElementSibling.nextElementSibling.childNodes[2].innerText.trim()
    }, zoningLabelSelector)
    .end()
    .then(result => res.send(result))
    .catch((error) => {
      console.error('ERROR:', error)
      res.status(500).send()
    })
})

module.exports = router
