const express = require('express')
const fetch = require('isomorphic-fetch')
const Nightmare = require('nightmare')
const router = express.Router()

const zoningLabelSelector = 'a[href^="https://www.municode.com/library/co/boulder/codes/municipal_code?nodeId="]'

router.get('/', (req, res) => {
  res.render('index', { title: 'Boulder Zoning Lookup' })
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
      console.error('Search failed:', error)
      res.status(500).send()
    })
})

module.exports = router
