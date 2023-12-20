const express = require("express");
const path = require("path");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const dbPath = path.join(__dirname, "cricketMatchDetails.db");
const app = express();
app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
    matchId: dbObject.match_id,
    year: dbObject.year,
    playerMatchId: dbObject.player_match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

app.get("/players/", async (request, response) => {
  const getPlayerQuery = `
       SELECT
         *
       FROM
          player_details;`;
  const playerDetails = await db.all(getPlayerQuery);
  response.send(
    playerDetails.map((eachPlayer) =>
      convertDbObjectToResponseObject(eachPlayer)
    )
  );
});

app.get("/players/:playerId", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `
        SELECT
          *
        FROM 
          player_details
        WHERE 
          player_id = ${playerId};`;
  const player = await db.get(getPlayerQuery);
  response.send(convertDbObjectToResponseObject(player));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerName } = request.body;
  const { playerId } = request.params;
  const updatePlayerQuery = `
        UPDATE
           player_details
        SET 
           player_name = '${playerName}'

        WHERE   
           player_id = '${playerId}';`;
  await db.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `
       SELECT
        match_id as matchId,
        match,
        year
       FROM
         match_details
       WHERE  
         match_id = ${matchId};`;
  const match = await db.get(getMatchQuery);
  response.send(match);
});

app.get("/matches/:matchId/players/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `
       SELECT
        player_match_score.player_id as playerId,
        player_name as playerName
       FROM
        player_details INNER JOIN  player_match_score 
       ON
          player_details.player_id = player_match_score.player_id 
       WHERE
          match_id = ${matchId};
      `;
  const match = await db.all(getMatchQuery);
  response.send(match);
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getMatchQuery = `
       SELECT
        player_details.player_id as playerId,
        player_details.player_name as playerName,
        SUM(player_match_score.score) as totalScore,
        SUM(fours) AS totalFours,
        SUM(sixes) AS totalSixes
       FROM
        player_details INNER JOIN  player_match_score 
       ON
          player_details.player_id = player_match_score.player_id 
       WHERE
          player_details.player_id = ${playerId};
      `;
  const match = await db.get(getMatchQuery);
  response.send(match);
});

app.get("/players/:playerId/matches/", async (request, response) => {
  try {
    const { playerId } = request.params;

    // Query to get all matches of a player
    const getPlayerMatchesQuery = `
      SELECT
        match_details.match_id as matchId,
        match_details.match,
        match_details.year
      FROM
        match_details
      INNER JOIN
        player_match_score
      ON
        match_details.match_id = player_match_score.match_id
      WHERE
        player_match_score.player_id = ${playerId};
    `;

    const playerMatches = await db.all(getPlayerMatchesQuery);

    // Send the list of matches as a response
    response.send(playerMatches);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    response.status(500).send("Internal Server Error");
  }
});
module.exports = app;
