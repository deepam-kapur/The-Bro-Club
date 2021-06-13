const express = require("express");

const app = express();
app.use(express.static("public"));

const PORT = process.env.PORT || 3000;

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/code/subscribe.html");
});

app.listen(PORT, function () {
    console.log("Server started successfully on " + PORT + " port.");
})