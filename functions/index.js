const functions = require("firebase-functions");

const express = require("express");

const app = express();

const path = require("path");

app.use(express.json({ limit: "50mb", extended: true }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));

var admin = require("firebase-admin");

var serviceAccount = require("./admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const partyRef = admin.firestore().collection("Party");

const medicinesRef = admin.firestore().collection("Medicines");

const partyMedicineRef = admin.firestore().collection("PartyMedicine");

const configRef = admin.firestore().collection("Config");

// Define a route to serve the "dashboard.html" file as the homepage

app.get("/home", (req, res) => {
  res.sendFile(path.join(__dirname, "./src/dashboard.html"));
});

app.get("/getParty", async (req, res, next) => {
  await partyRef.get().then((value) => {
    const data = value.docs.map((doc) => doc.data());
    res.status(200).send({
      message: "Fetched all Parties",
      data: data,
    });
  });
});

app.get("/getMedicines", async (req, res, next) => {
  await medicinesRef.get().then((value) => {
    const data = value.docs.map((doc) => doc.data());
    res.status(200).send({
      message: "Fetched all Parties",
      data: data,
    });
  });
});

app.get("/getPartyMedicine", async (req, res, next) => {
  await partyMedicineRef.get().then((value) => {
    const data = value.docs.map((doc) => doc.data());
    res.status(200).send({
      message: "Fetched all Parties",
      data: data,
    });
  });
});

// app.get("/getConfig", async (req, res, next) => {
//   try {
//     // Get the existing config document
//     const configDoc = await configRef.doc("Sjo3ebEuKSgiHuWNLlNA").get();

//     if (!configDoc.exists) {
//       return res.status(404).json({
//         message: "Config document not found.",
//       });
//     }

//     // Return the updated config data in the response
//     var updatedConfigData = configDoc.data();

//     const updatedField = parseInt(updatedConfigData.NXT_MED_ID) + 1; // Update this with your new value

//     await configRef.doc("Sjo3ebEuKSgiHuWNLlNA").update({
//       NXT_MED_ID: updatedField,
//     });

//     // Fetch the updated config document
//     updatedConfigData = configDoc.data();

//     res.status(200).json({
//       message: "Config updated successfully.",
//       data: updatedConfigData,
//     });
//   } catch (error) {
//     console.error("Error updating Config document:", error);
//     return res.status(500).json({
//       message: "Internal server error.",
//       error: error.message,
//     });
//   }
// });

app.get("/createMedicine", async (req, res) => {
  try {
    // Extract data from the request body
    const { CP, MRP, Name, SP } = req.body;

    // Check if required fields are present
    if (!Name) {
      return res.status(400).json({
        message: "Please enter valid name.",
        code: 2,
      });
    }

    // Check if a medicine with the same name already exists
    const existingMedicineQuery = await medicinesRef
      .where("Name", "==", Name)
      .get();

    if (!existingMedicineQuery.empty) {
      return res.status(400).json({
        message: "A medicine with the same name already exists.",
        code: 3,
      });
    }

    // Fetch the config document
    const configDoc = await configRef.doc("Sjo3ebEuKSgiHuWNLlNA").get();

    if (!configDoc.exists) {
      return res.status(404).json({
        message: "Config document not found.",
      });
    }

    const configData = configDoc.data();

    // Get the current NXT_MED_ID and other relevant fields from the config
    const { MED_ID_PREFIX, NXT_MED_ID } = configData;

    // Generate a new medicine ID by concatenating the prefix and next ID
    const id = MED_ID_PREFIX + "_" + NXT_MED_ID;

    //create medicine with the id created above
    const medicineData = {
      id,
      CP,
      MRP,
      Name,
      SP,
    };
    await medicinesRef.doc(id).set(medicineData);

    // Increment the NXT_MED_ID by 1
    const updatedNXT_MED_ID = NXT_MED_ID + 1;

    // Update the NXT_MED_ID in the config document
    await configRef.doc("Sjo3ebEuKSgiHuWNLlNA").update({
      NXT_MED_ID: updatedNXT_MED_ID,
    });

    return res.status(200).json({
      message: "Medicine created successfully.",
      medicine: medicineData,
    });
  } catch (error) {
    console.error("Error fetching Config and creating Medicine:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message,
      code: 500,
    });
  }
});

app.post("/addMedicine", async (req, res) => {
  try {
    // Extract data from the request body
    const { CP, MRP, Name, SP } = req.body;

    // Check if required fields are present
    if (!CP || !MRP || !Name || !SP) {
      return res.status(400).json({
        message: "Incomplete data. Please provide values for all fields.",
      });
    }

    // Create a new document reference with the specified document name
    const newMedicineRef = medicinesRef.doc();

    // Define the data for the new document
    const medicineData = {
      CP,
      MRP,
      Name,
      SP,
    };

    // Set the data in the Firestore document
    await newMedicineRef.set(medicineData);

    return res.status(201).json({
      message: "Medicine document created successfully.",
      data: medicineData,
    });
  } catch (error) {
    console.error("Error creating Medicine document:", error);
    return res.status(500).json({
      message: "Internal server error.",
      error: error.message,
    });
  }
});

exports.api = functions.https.onRequest(app);
