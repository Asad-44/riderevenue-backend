require("dotenv").config();
const { sql, poolPromise } = require("./config/db");

async function test() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT GETDATE() AS time");
        console.log("DB Time:", result.recordset);
    } catch (err) {
        console.error(err);
    }
}

test();
