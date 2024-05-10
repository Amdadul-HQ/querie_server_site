const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser')
require('dotenv').config()
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const app = express()


app.use(cors({
    origin: [
      "http://localhost:5173",
    ],
    credentials: true,
  }))
app.use(cookieParser())
app.use(express.json())




const uri = "mongodb+srv://rimonamdadul301:NpaJ41xKxrTwYIo8@cluster1.pcyedvs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("queryDB");
    const queryCollection = database.collection("querypost");
    const queryPostCollection = database.collection("posts");
    const recommendationPostCollection = database.collection("recommendation");


    app.get('/posts',async(req,res)=> {
        const cursor = queryCollection.find()
        const result = await cursor.toArray()
        res.send(result)
    })

    app.post('/queryPost',async(req,res)=> {
      const postData = req.body;
      const result = await queryPostCollection.insertOne(postData)
      res.send(result)
    })

    app.post('/recommendationPost',async(req,res)=> {
      const recommendationData = req.body;
      console.log(recommendationData);
      const result = await recommendationPostCollection.insertOne(recommendationData)
      res.send(result)
    })
    
    app.get('/recommendationPost',async(req,res)=> {
      const email = req.query.email;
      const query = {
        userEmail: email
      }
      const result = await recommendationPostCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/myrecommendation',async(req,res)=> {
      const email = req.query.email;
      const query = {
        recommendUserEmail: email
      }
      const result = await recommendationPostCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/queryPost',async(req,res)=> {
      let query ={}
      if(req.query?.email){
        query = {
          email:req.query?.email
        }
      }
      const cursor = queryPostCollection.find(query)
      console.log(cursor);
      const result = await cursor.toArray()  
      res.send(result)
    })

    app.get('/details/:id',async(req,res)=> {
      const id = req.params.id;
      const query = {
        _id : new ObjectId(id)
      }
      const result = await queryPostCollection.findOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/',(req,res)=> {
    res.send('Server is running')
})

app.listen(port,()=> {
    console.log(`server is Running On: ${port}`);
})