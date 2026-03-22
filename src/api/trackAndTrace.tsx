import express, { Request, Response } from 'express';
import { MongoClient } from 'mongodb';

const app = express();
const port = 3000;

// Conectar a la base de datos
const client = new MongoClient('mongodb://localhost:27017');
const db = client.db();

// Definir la API RESTful
app.get('/trackAndTrace', async (req: Request, res: Response) => {
    const trackingId = req.query.trackingId;
    const trackingData = await db.collection('trackingData').findOne({ trackingId });
    res.json(trackingData);
});

app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});