require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const app = express()
const stripe = require('stripe')(process.env.STRIP_KEY)


app.use(cors({
    origin: [
      "http://localhost:5173",
      "https://shop-now-fc5a4.web.app",
      "https://shop-now-fc5a4.firebaseapp.com"
    ],
    credentials: true,
  }))
app.use(cookieParser())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.pcyedvs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster1`;

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
    // await client.connect();

    const database = client.db("queryDB");
    const queryPostCollection = database.collection("posts");
    const recommendationPostCollection = database.collection("recommendation");

    const varifyToken = async(req,res,next)=>{
      const token = req.cookies?.token;
      if(!token){
       return res.status(401).send({message:'not authorize'})
      }
      jwt.verify(token,process.env.ACCESS_TOKEN_SECREAT,(error,decoded)=>{
        if(error){
          return res.status(401).send({message:"unauthorize"})
        }
        if(decoded){
          req.user = decoded
          next()
        }
      })
    }
    // Stripe seassin api
    app.post('/create-checkout-session',async(req,res)=>{
      const quantity = 1 
      const session = await stripe.checkout.sessions.create({
        success_url: `${process.env.ClIENT_URL}`,
        cancel_url:`${process.env.ClIENT_URL}`,
        line_items :[
          {
            price: process.env.STRIP_BASIC_ID,
            quantity:quantity 
          }
        ],
        mode:'subscription'
      })
      const sessionId = session.id
      console.log(sessionId);
      res.send({url:session.url})
    })
    app.post('/create-checkout-session-expart',async(req,res)=>{
      const quantity = 1 
      const session = await stripe.checkout.sessions.create({
        success_url: `${process.env.ClIENT_URL}`,
        cancel_url:`${process.env.ClIENT_URL}`,
        line_items :[
          {
            price: process.env.STRIP_EXPART_ID,
            quantity:quantity 
          }
        ],
        mode:'subscription'
      })
      const sessionId = session.id
      console.log(sessionId);
      res.send({url:session.url})
    })

    app.post('/jwt',async(req,res)=>{
      const user = req.body;
      const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECREAT,{expiresIn:'1h'})
      res
      .cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' ? true : false , 
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      
      })
      .send({success:true})
    })

    app.post('/logout',async(req,res)=> {
      const user = req.body
      res.clearCookie('token',{
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' ? true : false ,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        maxAge:0
      }).send({success:true})
    })



    app.post('/queryPost',async(req,res)=> {
      const postData = req.body;
      const result = await queryPostCollection.insertOne(postData)
      res.send(result)
    })

    app.post('/recommendationPost',async(req,res)=> {
      const recommendationData = req.body;
      const result = await recommendationPostCollection.insertOne(recommendationData)
      res.send(result)
    })
    
    app.get('/recommendationPost',varifyToken,async(req,res)=> {
      if(req.user.email !== req.query.email){
          return res.status(403).send({message:'Forbidden Access'})
      }
      const email = req.query.email;
      const query = {
        userEmail: email
      }
      const result = await recommendationPostCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/queryRecommendation/:id',async(req,res)=> {
      const id = req.params.id;
      const filter ={
        queryId:id
      }
      const result = await recommendationPostCollection.find(filter).toArray()
      res.send(result)
    })

    app.get('/myrecommendation',varifyToken,async(req,res)=> {
      if(req.user.email !== req.query.email){
        return res.status(403).send({message:'Forbidden Access'})
    }
      const email = req.query.email;
      const query = {
        recommendUserEmail: email
      }
      const result = await recommendationPostCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/queryPost', async(req,res)=> {
      let query ={}
      if(req.query?.email){
        query = {
          email:req.query?.email
        }
      }
      const cursor = queryPostCollection.find(query)
      const result = await cursor.toArray()  
      res.send(result)
    })

    app.get('/queryallpost', async(req,res)=> {
      const size = parseInt(req.query.size);
      const page = parseInt(req.query.page) - 1;
      const search = req.query.search
      // console.log(size,page);
      let query = {}
      if(search){
        query = {
          productName:{$regex:search , $options:'i'},
        }

      }

      const result = await queryPostCollection.find(query).skip(size * page).limit(size).toArray()
      res.send(result)
    })


    // pagenation && search

    app.get('/queryCount',async(req,res)=> {
      
      const count = await queryPostCollection.countDocuments()

      res.send({count})
    })

    app.patch('/update/:id',async(req,res)=>{
      const id = req.params.id;
      const updateData = req.body;
      const query = {
        _id:new ObjectId(id)
      }
      
      const upDoc = {
        $set:{
          productImg:updateData.updateProductImg,
          queryTitle:updateData.updateQueryTitle,
          productName:updateData.updateProductName,
          brandName:updateData.updateBrandName,
          alternationReason:updateData.updateAlternationReason,
          postedDate:updateData.updatePostedDate,
          email:updateData.updateEmail,
          name:updateData.updateUserName,
          userPhoto:updateData.updateUserPhotoUrl
        }
      }
      const options = { upsert: true };
      const result = await queryPostCollection.updateOne(query,upDoc,options)
      res.send(result)
    })

    app.delete('/query/:id',async(req,res)=> {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      }
      const result = await queryPostCollection.deleteOne(query)
      res.send(result)
    })

    app.delete('/recommendation/:id',async(req,res)=>{
      const id = req.params.id
      const query = {
        _id :new ObjectId(id)
      }
      const result = await recommendationPostCollection.deleteOne(query)
      res.send(result)
    })

    app.delete('/myrecommendation/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id)
      }
      const result = await recommendationPostCollection.deleteOne(query)
      res.send(result)
    })


    app.get('/details/:id',varifyToken,async(req,res)=> {
      const id = req.params.id;
      const query = {
        _id : new ObjectId(id)
      }
      const result = await queryPostCollection.findOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
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