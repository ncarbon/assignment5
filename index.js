const express = require('express');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const sqlite3 = require('sqlite3').verbose();
const request = require('request-promise');
const PORT = process.env.port || 3100;
const app = express();


app.use(methodOverride('_method'));

app.set('view engine', 'ejs');
app.use(express.static(__dirname + "/public"));

app.use(bodyParser.json()); 

app.use(bodyParser.urlencoded({ extended: true })); 

let db =  new sqlite3.Database('./db/flowers.db', sqlite3.OPEN_READWRITE, (err) => {
    if(err) {
        console.log(err);
    }
    console.log('CONNECTED TO THE DATABASE');
});

app.get('/', (req, res) => {
    res.render('index');
});

app.post('/search', (req, res) => {
    console.log(req.body.searchQuery)
    let searchQuery = `SELECT * FROM SIGHTINGS WHERE NAME = ? COLLATE NOCASE`;
    db.all(searchQuery, [req.body.searchQuery], (err, rows) => {
        if(err) {
            console.log(err);
            res.render('error', {current: req.body.searchQuery, error: {title: `Error: could not find listings for ${req.body.searchQuery}`, message: `Please try again with a different flower name.`}});
        }
        console.log(rows);
        res.render('searchResults', {searchQuery: req.body.searchQuery, results: rows});
    });
});

/*
    GET route for displaying ALL flowers
*/
app.get('/flowers', (req, res )=> {
    // display list of all flowers
    let allFlowersQuery = `SELECT * FROM FLOWERS`;
    db.all(allFlowersQuery, [], (err, rows) => {
        if(err) {
            console.log(err);
            res.render('error', {current: 'Flowers', error: {title: `Error: could not find sightings for ${req.params.name}`, message: `Please try again with a different flower name.`}});
        }
        console.log(rows);
        res.render('flowers', {flowers: rows});
    });
});

/*
    GET route for displaying 10 most recent sightings for a particular flower
*/
app.get('/flowers/:name', (req, res) => {
    let recentSightingsQuery = `SELECT * FROM SIGHTINGS WHERE NAME = ? ORDER BY SIGHTED DESC LIMIT 10`;
    db.all(recentSightingsQuery, req.params.name, [], (err, rows) => {
        if(err) {
            console.log(err);
            res.render('error', {current: req.params.name, error: {title: `Error: could not find sightings for ${req.params.name}`, message: `Please try again with a different flower name.`}});
        }
        if(rows.length < 1) {
            console.log(`No sightings found for ${req.params.name}`);
            res.render('message', {current: req.params.name, message: {title: `No sightings found for ${req.params.name}`, message: `Try again with a different flower name.`}});
        } else {
            const options = {
                method: 'GET',
                uri: `https://www.googleapis.com/customsearch/v1?key=AIzaSyBv7NoslxpWMT08AmOcFLUiQNqPTDj3_GU&cx=007253857045997363824%3Abnjbywim8mi&q=${req.params.name} plant&searchType=image&fileType=jpg&imgSize=small&alt=json`,
                jsom: true
            }
            request(options).then((response) => {
                console.log(response);
                res.render('flower', {current: req.params.name, flowers: rows, imageUrl: JSON.parse(response).items[0].link});
            }).catch((err) => {
                console.log(err);
                res.render('flower', {current: req.params.name, flowers: rows, imageUrl: response.items[0].link});
            });
        }
    });
});

/*
    DELETE route for deletinig a flower
*/
app.delete('/flowers/:name', (req, res) => {
    let deleteFlowerQuery = `DELETE FROM FLOWERS WHERE COMNAME = ?`;
    db.run(deleteFlowerQuery, [req.params.name], (err) => {
        if(err) {
            console.log(err);
            res.render('error', {current: req.params.name, error: {title: `Error: could not delte ${req.params.name}`, message: `Please try again.`}});
        } else {
            console.log(`FLOWERS TABLE: ${req.params.name} successfully deleted`);
            res.redirect(`/flowers`);
        }
    });
});


/*
    PUT route for updating a flower
*/

app.put('/flowers/:name', (req, res) => {
    let newData = [req.body.genus, req.body.species, req.body.comname, req.params.name];
    console.log(newData)
    let updateFlowerQuery = `UPDATE FLOWERS SET GENUS = ?, SPECIES = ?, COMNAME = ? WHERE COMNAME = ?`;
    db.run(updateFlowerQuery, newData, (err) => {
        if(err) {
            console.log(err);
            res.render('error', {current: req.params.name, error: {title: `Error: could not update ${req.params.name}`, message: `Please try again.`}});
        } else {
            console.log(`FLOWERS TABLE: ${req.params.name} successfully updated`);
            res.redirect(`/flowers/${req.params.name || req.params.name}`);
        }
    });
});

/*
    GET route for displaying ALL sightings
*/
app.get('/sightings', (req, res) => {
    let query = `SELECT * FROM SIGHTINGS`;
    db.all(query, [], (err, rows) => {
        if(err) {
            console.log(err);
            res.render('error', {current: 'Sightings', error: {title: `Error: could not display sightings`, message: `Please try again.`}});
        } else if(rows.length < 1) {
            console.log(`No sightings`);
            res.render('message', {current: 'Sightings', message: {title: `Could not find sightings`, message: ``}});
        } else {
            console.log(rows);
            res.render('sightings', {sightings: rows});
        }
    });
});

/*
    GET route for displaying sightings for a particular flower
*/
app.get('/sightings/:name', (req, res) => {
    let query = `SELECT * FROM SIGHTINGS WHERE NAME = ?`;
    db.all(query, req.params.name, [], (err, rows) => {
        if(err) {
            console.log(err);
            res.render('error', {current: req.params.name, error: {title: `Error: could not display sightings for ${req.params.name}`, message: `Please try again.`}});
        } else if(rows.length < 1) {
            console.log(`No sightings found for ${req.params.name}`);
            res.render('message', {current: req.params.name, message: {title: `No sightings found for ${req.params.name}`, message: `Try again with a different flower name.`}});
        } else {
            console.log(rows);
            res.render('sighting', {current: req.params.name, sightings: rows});
        }
    });
});

/*
    POST route for inserting a flower
*/
app.post('/sightings', (req, res) => {
    let insertQuery = `INSERT INTO SIGHTINGS VALUES(?, ?, ?, ?)`;
    db.run(insertQuery, [req.body.comname, req.body.person, req.body.location, req.body.date], (err) => {
        if(err) {
            console.log(err);
            res.render('error', {current: 'Sightings', error: {title: `Error: could not insert sighting`, message: `Please try again.`}});
        } else {
            console.log(`SIGHTINGS TABLE: ${req.body} successfully inserted`);
            res.redirect(`/sightings/${req.body.comname}`);
        }
    });
});


app.listen(PORT, () => {
    console.log( `Listening on port ${PORT}`);
});





