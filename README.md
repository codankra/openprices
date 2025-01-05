# Open Prices 📊💰🛒

![Site Preview](/public/header_preview.png)

Open Prices is a crowdsourced platform for tracking real-world prices of everyday products. The goal is to provide a more accurate, transparent, and uncorruptible record of current and historical prices. Right now the focus is grocery (and soon restaurant) prices.

This is a new project under early development, being built in public, to the point I feel embarrassed and vulnerable by showing it. Check out the live site at [openpricedata.com](https://openpricedata.com) ([cpipal.com](https://www.cpipal.com) is also an option). Tell me which site name you like better in the [poll in Discussions 📝](https://github.com/codankra/openprices/discussions/2)

## 🛠 Built With

- [React](https://reactjs.org/) & [React Router](https://reactrouter.com/)
- [TypeScript](https://www.typescriptlang.org/)
- [LibSQL](https://github.com/libsql/libsql)
- [AWS S3](https://aws.amazon.com/s3/) via [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/)
- [Google Vision](https://cloud.google.com/vision)
- [Recharts](https://recharts.org/) & [Tailwind CSS](https://tailwindcss.com/)

Hosted on [Fly.io](https://fly.io/)

## 🚀 Getting Started Locally

### Prerequisites

- Your favorite between Deno 2, Bun, or Node.js v18 or later
- Set up your own environment variables for Cloudflare, Google/Github Auth, and Turso

### Installation

I try to keep things simple. This should be familiar 😇

1. Clone the repository:

   ```
   git clone https://github.com/codankra/openprices.git
   cd openprices
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development server:

   ```
   npm run dev
   ```

4. Open your browser and visit `http://localhost:3000`

### Cloudflare Tunnel Setup (Optional)

This project includes a `cloudflared.yml` configuration file for setting up a Cloudflare Tunnel. This is useful for testing mobile or device-specific features in development. To use it:

1. Install cloudflared CLI tool from [Cloudflare's documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)

2. Create a tunnel in your Cloudflare account:

   ```bash
   cloudflared tunnel create your-tunnel-name
   ```

3. Update the `cloudflared.yml` file with your values:

   - Replace `YOUR_USERNAME` with your Cloudflare username
   - Replace `YOUR_TUNNEL_ID` with the ID from step 2
   - Replace `YOUR_HOSTNAME` with your desired hostname

4. Start the tunnel as part of the project setup in `tmux-sesion.sh`, or manually with:
   ```bash
   cloudflared tunnel --config ./cloudflared.yml run your-tunnel-name
   ```

The tunnel will now proxy requests from your Cloudflare hostname to your local development server.

## 🤝 Contributing

I'd love your help in making Open Price even better! If you have an awesome idea, or notice any bug or area of improvement, here's how you can contribute:

1. Open a Pull Request or
2. Feel free to reach out here on GitHub, or [here](https://x.com/thedanktoday)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🤔 FAQ

**Q: What's the purpose of open prices?**  
A: I'm aiming to provide a more accurate, crowdsourced, uncorruptable record of real current and historical prices - fueled by contributions on products we actually buy. Ever noticed that the change in your gas or grocery bill doesn't match the government-reported inflation rate? Let's see how this experiment plays out!

**Q: Do I need an account to use this site?**  
A: Nope! No account is needed to browse, but you'll need one to contribute data (to prevent spam and abuse).

**Q: How is Open Prices 'open'?**  
A: It's open for anyone to see and contribute, and my hope is also to open source future stable services the website will use, so if I develop a budgeting tool for example people can just run that locally/independently. For the moment, the core website code is open source (you are here!)

## 💖 Support the Project

If you find Open Prices useful, I'd be grateful if you could:

1. Star this GitHub repo
2. Tell your friends and family about the openprices project
3. [Support the Developer Here](https://ko-fi.com/thedank)

Your support keeps me going! ❤️ Thank You
