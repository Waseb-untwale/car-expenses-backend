const upload = require("../middleware/uploadMiddleware");

// Define accepted fields
const uploadFields = upload.fields([
    { name: "receiptImage", maxCount: 1 },
    { name: "transactionImage", maxCount: 1 },
    { name: "punctureImage", maxCount: 1 },
    { name: "otherProblemsImage", maxCount: 1 },
    { name: "vehicleServicingImage", maxCount: 1 },
    {name : "vehicleServicingReceiptImage", maxCount: 1 },
    { name: "cabImage", maxCount: 1 }
]);

module.exports = uploadFields;
