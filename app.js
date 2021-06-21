const { json } = require("express");
const express = require("express");
const mongoose = require("mongoose");
const useragent = require('express-useragent');
const sgMail = require('@sendgrid/mail');

require('dotenv').config();
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.DB_URL + "/theBroClubDB", { useNewUrlParser: true });

const visitorSchema = {
    platform: String,
    browser: String,
    os: String,
    source: String,
    ip: String
};

const Visitor = mongoose.model("Visitor", visitorSchema);

const subscribersSchema = {
    fullName: String,
    email: String,
    visitor: Object
};

const Subscriber = mongoose.model("Subscriber", subscribersSchema);

const contactsSchema = {
    fullName: String,
    email: String,
    message: String
};

const Contact = mongoose.model("Contact", contactsSchema);

app.get("/", function (req, res) {
    const useragentValue = useragent.parse(req.headers['user-agent']);

    const visitor = new Visitor({
        platform: useragentValue.platform,
        browser: useragentValue.browser,
        os: useragentValue.os,
        source: useragentValue.source,
        ip: req.ip
    });
    visitor.save(function (err) {
        console.log(err);
    });

    res.sendFile(__dirname + "/code/subscribe.html");
});

app.post("/subscribe", function (req, res) {
    const fullName = req.body.fullName.trim();
    const email = req.body.email.trim();
    if (email === "" || fullName === "") {
        res.json({ success: false, alreadyExists: false, error: "Name or Email can't be empty." });
    }
    const useragentValue = useragent.parse(req.headers['user-agent']);

    const visitorJSON = {
        platform: useragentValue.platform,
        browser: useragentValue.browser,
        os: useragentValue.os,
        source: useragentValue.source,
        ip: req.ip
    };

    const visitor = new Visitor(visitorJSON);

    visitor.save(function (err, data) {
        if (err) {
            console.log(err);
            let emailHTML = '<div><h3>Error in Visitors Data</h3><p><strong>Visitor JSON - </strong> - ' + JSON.stringify(visitorJSON) + '</p><p><strong>Error - </strong>' + JSON.stringify(err) + '</p></div>';
            sendMail("Error in saving visitor data!", emailHTML);
            res.json({ success: false, alreadyExists: false, error: err });
        }
        else {
            const subscriberJSON = {
                fullName: fullName,
                email: email,
                visitor: mongoose.Types.ObjectId(data._id)
            };
            const subscriber = new Subscriber(subscriberJSON);
            Subscriber.findOne({ email: email }, function (err, foundEmail) {
                if (err) {
                    console.log(err);
                    let emailHTML = '<div><h3>Error in Subscribers Data</h3><p><strong>Subscriber JSON - </strong> - ' + JSON.stringify(subscriberJSON) + '</p><p><strong>Error - </strong>' + JSON.stringify(err) + '</p></div>';
                    sendMail("Error in saving subscribers finding data!", emailHTML);
                    res.json({ success: false, alreadyExists: false, error: err });
                }
                if (foundEmail) {
                    console.log("Already Exists.");
                    res.json({ success: true, alreadyExists: true });
                }
                else {
                    console.log("Data saved successfully.");
                    subscriber.save(function (err) {
                        if (err) {
                            let emailHTML = '<div><h3>Error in Subscribers Data</h3><p><strong>Subscriber JSON - </strong> - ' + JSON.stringify(subscriberJSON) + '</p><p><strong>Error - </strong>' + JSON.stringify(err) + '</p></div>';
                            sendMail("Error in saving subscribers saving data!", emailHTML);
                            res.json({ success: false, alreadyExists: false, error: err });
                        }
                        else {
                            let emailHTML = '<div><p><strong>Full Name - </strong>' + subscriberJSON.fullName + '</p><p><strong>Email - </strong>' + subscriberJSON.email + '</p></div>';
                            sendMail("New Subscriber - " + fullName + "!", emailHTML);
                            res.json({ success: true, alreadyExists: false });
                        }
                    });
                }
            });
        }
    });
});

app.post("/contactUs", function (req, res) {
    const fullName = req.body.fullName.trim();
    const email = req.body.email.trim();
    const message = req.body.message.trim();

    if (email === "" || fullName === "" || message === "") {
        res.json({ success: false, error: "Name or Email can't be empty." });
    }

    const contactJSON = {
        fullName: fullName,
        email: email,
        message: message
    };

    const contact = new Contact(contactJSON);

    contact.save(function (err) {
        if (err) {
            let emailHTML = '<div><h3>Error in Contact Form Data</h3><p><strong>Contact JSON - </strong> - ' + JSON.stringify(contactJSON) + '</p><p><strong>Error - </strong>' + JSON.stringify(err) + '</p></div>';
            sendMail("Error in saving contacting saving data!", emailHTML);
            res.json({ success: false, error: err });
        }
        else {
            let emailHTML = '<div><p><strong>Full Name - </strong>' + contactJSON.fullName + '</p><p><strong>Email - </strong>' + contactJSON.email + '</p><p><strong>Message - </strong>' + contactJSON.message + '</p></div>';
            sendMail("Somebody wants to connect - " + fullName + "!", emailHTML);
            res.json({ success: true });
        }
    });
});

function sendMail(subject, html) {
    let msg = {
        to: 'reachthebroclub@gmail.com',
        from: 'reachthebroclub@gmail.com',
        subject: subject,
        html: html
    };

    (async () => {
        try {
            await sgMail.send(msg);
        } catch (error) {
            console.error(error);
            if (error.response) {
                console.error(error.response.body)
            }
        }
    })();
}

app.listen(PORT, function () {
    console.log("Server started successfully on " + PORT + " port.");
})