const { Dexie } = require('dexie');
const db = new Dexie('testdb');
db.version(1).stores({ checkInLogs: 'id, studentId, activityId, timestamp' });
async function test() {
  try {
    await db.checkInLogs.where({ studentId: '123', activityId: '456' }).first();
    console.log("SUCCESS");
  } catch(e) {
    console.error("ERROR", e);
  }
}
test();
