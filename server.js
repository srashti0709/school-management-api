const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test DB connection
pool.connect()
  .then(() => {
    console.log("Connected to PostgreSQL");
  })
  .catch((err) => {
    console.log("Database connection failed:", err);
  });


// ================= ADD SCHOOL =================

app.post("/addSchool", async (req, res) => {
  const { name, address, latitude, longitude } = req.body;

  // Validation
  if (!name || !address || latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      message: "All fields are required",
    });
  }

  try {
    const query = `
      INSERT INTO schools (name, address, latitude, longitude)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `;

    const values = [name, address, latitude, longitude];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: "School added successfully",
      schoolId: result.rows[0].id,
    });

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Database error",
      error: err.message,
    });
  }
});


// ================= LIST SCHOOLS =================

app.get("/listSchools", async (req, res) => {
  const { latitude, longitude } = req.query;

  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      message: "Latitude and longitude are required",
    });
  }

  try {
    const result = await pool.query("SELECT * FROM schools");

    const schools = result.rows;

    // Haversine Formula
    const getDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371;

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

    const schoolsWithDistance = schools.map((school) => {
      const distance = getDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(school.latitude),
        parseFloat(school.longitude)
      );

      return {
        ...school,
        distance: distance.toFixed(2),
      };
    });

    schoolsWithDistance.sort((a, b) => a.distance - b.distance);

    res.json(schoolsWithDistance);

  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Database error",
      error: err.message,
    });
  }
});


// ================= ROOT =================

app.get("/", (req, res) => {
  res.send("Server running");
});


// ================= PORT =================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});