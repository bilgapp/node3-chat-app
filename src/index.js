const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

const port = process.env.PORT

const app = express()
const server = http.createServer(app)
const io = socketio(server)

app.use(express.json())

// define paths for express config
const publicPath = path.join(__dirname, "../public")

// Setup static directory 
app.use(express.static(publicPath))

io.on('connection', (socket) => {
    console.log('New server connection')

    socket.on('join', ({ username, room }, callback) => {
        const { user, error } = addUser({ id: socket.id, username, room })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', "Welcome!"))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} joined`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const filter = new Filter()

        if (filter.isProfane(message)) {
            return callback('Profanity is not allowed')
        }

        const user = getUser(socket.id)
        io.to(user.room).emit('message', generateMessage(user.username, message))
        callback()
    })

    socket.on('sendLocation', (coordinations, callback) => {
        locationString = `https://google.com/maps?q=${coordinations.latitude},${coordinations.longitude}`
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateMessage(user.username, locationString))
        callback()
    })

    socket.on('disconnect', () => {
        const user = removeUser(socket.id)
console.log('user:', user)
        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} left`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log('Server is up on port ' + port)
})