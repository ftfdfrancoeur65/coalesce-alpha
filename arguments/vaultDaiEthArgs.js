const networks = require('../config/networks.json');

let frequency =  3600
let periods = 5
let vaultDepositer = '0x4993eA3aaE13aAfc433Ad66fe756f91E253622CA'
let underlying =  '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063'
let target = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619'

module.exports = [
  frequency, periods, vaultDepositer, underlying, target, 0, networks.polygon.sushi_router
];