const express = require('express')
const fetch = require('isomorphic-fetch')
const router = express.Router()

router.get('/', (req, res) => {
  res.render('index', { title: 'Boulder Zoning Lookup' })
})

router.get('/proxy/:url', (req, res) => {
  console.log(decodeURIComponent(req.params.url))
  fetch(decodeURIComponent(req.params.url))
    .then(res => res.text())
    .then(text => {
      res.send(text)
    })
    .catch(err => {
      console.error(err)
      res.status(500).send()
    })
})

module.exports = router
