
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')('sk_test_51RK2BSBUewpGj27iUovGp2tAh6SEnm6mybYpalEf3nZbxUVQGzRDUPrEKoTZDfZnbtvXpksQfo67JWELsGew9YaL00kqspjbxs');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
  const { items, email } = req.body;
  const line_items = items.map(item => ({
    price_data: {
      currency: 'eur',
      product_data: {
        name: item.name,
      },
      unit_amount: Math.round(item.price * 100),
    },
    quantity: item.quantity,
  }));

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: 'https://sylvaea.com/success',
      cancel_url: 'https://sylvaea.com/cancel',
      customer_email: email,
    });
    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Sylváea Checkout API is running.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
