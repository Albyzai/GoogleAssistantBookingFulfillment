const express = require('express')
const bodyParser = require('body-parser')
const axios = require('axios')

// Import the appropriate service and chosen wrappers
const {
  dialogflow,
  Permission,
  Suggestions
} = require('actions-on-google')

//  helper functions

const getbuildings = async () => {
  const buildings = await axios.get('https://googleassistantbookingapi.azurewebsites.net/api/buildings')
    .then(res => res.data)

  return buildings
}

const createBooking = async (bookedBy, roomName, floorName, buildingName, date, startTime, endTime) => {
  console.log(`The params: username: ${bookedBy}, roomName: ${roomName}, floorName: ${floorName}, buildingName: ${buildingName}, date: ${date}, startTime: ${startTime}, endTime: ${endTime}`)
  const response = await axios.post('https://googleassistantbookingapi.azurewebsites.net/api/reservations', {
    bookedBy,
    roomName,
    floorName,
    buildingName,
    date,
    startTime,
    endTime
  })
    .then(res => res)

  console.log('response from post: ', response)
  return response
}

const buildings = getbuildings()

// Create an app instance
const agent = dialogflow({ debug: true })

// Register handlers for Dialogflow intents

agent.intent('Default Welcome Intent', conv => {
  buildings.then(buildings => {
    const buildingNames = buildings.map(building => `Yes please, in ${building.name}`)
    console.log('buildingNames: ', buildingNames)
    // conv.ask('Welcome to our booking service, how can i help you today?')
    // conv.ask(new Suggestions(...buildingNames))

    conv.ask(new Permission({
      context: 'Welcome to our booking service. In order to create a booking',
      permissions: 'NAME'
    }))
  })
})

agent.intent('actions_intent_PERMISSION', (conv, params, permissionGranted) => {
  if (!permissionGranted) {
    conv.ask('Okay, no worries. We will manage without. How can i help you today?')
  } else {
    conv.data.userName = conv.user.name.display
    conv.ask(`Thank you, ${conv.data.userName}. How can i help you today?`)
  }
  conv.ask(new Suggestions('I would like to book a room', 'Can you tell me which rooms are available?'))
})

agent.intent('CreateReservation', (conv, { roomName, floorName, buildingName, date, timePeriod }) => {
  const startTime = timePeriod.startTime
  const endTime = timePeriod.endTime
  const response = createBooking(conv.data.userName, roomName, floorName, buildingName, date, startTime, endTime)

  if (response) {
    conv.close(`Thank you for booking a room. You will have access to ${roomName} on ${floorName} in ${buildingName} from ${new Date(startTime).getHours()} until ${new Date(endTime).getHours()}. Enjoy your day! `)
  } else {
    conv.ask('An error seems to have occured, would you like to try booking another room?')
  }
})

agent.intent('Default Fallback Intent', conv => {
  conv.ask('I didn\'t understand. Can you tell me something else?')
})

const app = express().use(bodyParser.json())
app.get('/', (req, res) => res.send('online'))
app.post('/dialogflow', agent)

module.exports = app
