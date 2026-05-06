const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "", // put your MySQL password here
    database: "school_management"
});

db.connect((err) => {
    if (err) {
        console.log("Database connection failed:", err);
    } else {
        console.log("Connected to MySQL");
    }
});

app.post("/addSchool", (req, res) => {
    const { name, address, latitude, longitude } = req.body;

    // ✅ Validation
    if (!name || !address || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: "All fields are required" });
    }

    if (typeof name !== "string" || typeof address !== "string") {
        return res.status(400).json({ message: "Name and address must be strings" });
    }

    if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ message: "Latitude and longitude must be numbers" });
    }

    // ✅ Insert into DB
    const query = `
        INSERT INTO schools (name, address, latitude, longitude)
        VALUES (?, ?, ?, ?)
    `;

    db.query(query, [name, address, latitude, longitude], (err, result) => {
        if (err) {
            return res.status(500).json({ message: "Database error", error: err });
        }

        res.status(201).json({
            message: "School added successfully",
            schoolId: result.insertId
        });
    });
});

app.get("/listSchools", (req, res) => {
    const { latitude, longitude } = req.query;

    // ✅ Validation
    if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
    }

    if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ message: "Latitude and longitude must be numbers" });
    }

    // ✅ Fetch all schools
    const query = "SELECT * FROM schools";

    db.query(query, (err, results) => {
        if (err) {
            return res.status(500).json({ message: "Database error" });
        }

        // 🔥 Haversine Formula (distance calculation)
        const getDistance = (lat1, lon1, lat2, lon2) => {
            const R = 6371; // Earth radius in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;

            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) *
                Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);

            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        // ✅ Add distance to each school
        const schoolsWithDistance = results.map((school) => {
            const distance = getDistance(
                parseFloat(latitude),
                parseFloat(longitude),
                school.latitude,
                school.longitude
            );

            return { ...school, distance: distance.toFixed(2) };
        });

        // ✅ Sort by distance
        schoolsWithDistance.sort((a, b) => a.distance - b.distance);

        res.json(schoolsWithDistance);
    });
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});