import express from 'express'

const app=express()
app.use(express.json())

app.get('/health',(req,res)=>{
    res.json({status:
        'ok'
    })

})

app.get('/hello/:name',(req,res) =>{
    res.json({message:`Hello, ${req.params.name}!`})
}
)


const PORT =process.env.PORT || 3000

app.listen(PORT,()=> {
    console.log(`Server running on http://localhost:${PORT}`)
} )

