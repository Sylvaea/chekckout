
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const stripe = require('stripe')('sk_test_51RK2BSBUewpGj27iUovGp2tAh6SEnm6mybYpalEf3nZbxUVQGzRDUPrEKoTZDfZnbtvXpksQfo67JWELsGew9YaL00kqspjbxs');

const app = express();
app.use(cors());
app.use(express.json());

const PAYPAL_CLIENT_ID = 'AV3W383P_QBvZLv7x2qYqII4MGBa0W_5OK1UKK7vKKrYHz4i68nKd6HOsrCFDdG69wRJcmj7VK3m7te4';
const PAYPAL_SECRET = 'EMokTXMkwSQplu-2UhWYvxSYQnOebYsvR7kpyVgy4rMiH4p2_7d_YZLxS2iRxgWMHy_7GrmJjmbvUn-Y';
const PAYPAL_API = 'https://api-m.sandbox.paypal.com';

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

app.post('/create-paypal-order', async (req, res) => {
  const { items } = req.body;
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2);

  try {
    const auth = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(PAYPAL_CLIENT_ID + ':' + PAYPAL_SECRET).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    }).then(res => res.json());

    const order = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.access_token}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'EUR',
            value: total,
          }
        }],
        application_context: {
          return_url: 'https://sylvaea.com/success',
          cancel_url: 'https://sylvaea.com/cancel',
        }
      })
    }).then(res => res.json());

    const approval = order.links.find(link => link.rel === 'approve');
    res.json({ url: approval.href });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Sylváea Checkout API is live.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
