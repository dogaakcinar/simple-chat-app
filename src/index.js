const express = require("express");
const http = require("http");
const path = require("path");
const socketio = require("socket.io");
const Filter = require("bad-words");
const {
  addUser,
  removeUser,
  getUser,
  getUsersinRoom,
} = require("./utils/users");
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const {
  generateMessage,
  generateLocationMessage,
} = require("./utils/messages");
const port = process.env.PORT || 3000;
const staticFolderPath = path.join(__dirname, "../public");
app.use(express.static(staticFolderPath));
app.get("/", (req, res) => {
  res.render(index);
});

io.on("connection", (socket) => {
  console.log("New connection websocket");

  socket.on("join", ({ username, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, username, room });

    if (error) {
      return callback(error);
    }

    socket.join(user.room);
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage(`${user.username} joined to room ${user.room}`, "Admin")
      );
      io.to(user.room).emit('roomdata', {
        room: user.room,
        users: getUsersinRoom(user.room)
      })
      console.log(getUsersinRoom(user.room))
    callback();
  });
  socket.on("clientMsg", (msg, callback) => {
    const user = getUser(socket.id)
    const filter = new Filter();
    if (filter.isProfane(msg)) {
      //io.emit("bad words not allowed")
      return callback("bad words not allowed");
    }
    io.to(user.room).emit("message", generateMessage(msg, user.username));
    callback();
  });
  socket.on("disconnect", () => {
    const user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit("message", generateMessage(`${user.username} has left`));
    }
  });
  socket.on("sendLocation", (coords, callback) => {
    const user = getUser(socket.id)
    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        `https://google.com/maps?q=${coords.latitude},${coords.longitude}`, user.name
      )
    );
    io.to(user.room).emit('roomData', {
      room: user.room,
      users: getUsersinRoom(user.room)
    })
    callback();
  });
});

server.listen(port, () => {
  console.log("Server is running on port ", port);
});
