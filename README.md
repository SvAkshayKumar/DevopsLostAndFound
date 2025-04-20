# 🚒 Lost and Found App

A full-stack Lost and Found application that helps users report, discover, and recover misplaced items. Built with **React**, **Node.js**, and **Supabase**, it offers a clean interface and powerful features for item tracking. SQLite is used specifically for OTP generation services.

---

## 🟢 Hosted App (Expo Build)
**[View the App on Expo](https://expo.dev/accounts/devadigaakshay04/projects/bolt-expo-nativewind/builds/e81c89b8-4502-4197-aeb4-cdf6200374fd)**

## 🔗 Repositories
- **Terms & Conditions (Live):** [Live Site](https://svakshaykumar.github.io/LostAndFound-TandC/)

> Note: The OTP & Feedback server is not publicly linked here to prevent exposing database access.

---

## ✨ Origin Story

This project started with a clean scaffold generated from [bolt.new](https://bolt.new). Early stages were powered by references and advice from ChatGPT and Grok...

...until all the GPTs started acting like clueless tour guides. 🛍️🤖 I had to take the wheel, drop the AI, and grind through the logic myself.

Let’s just say: the struggle was very real — but so was the learning! 💪

---

## 🔧 Product Backlog (Agile User Stories)

- ✅ As a user, I want to register and log in so that I can access the app securely.
- 🔒 Implement user registration and login
- 🔁 Password reset functionality
- 🧑‍💼 Profile editing
- 🔍 Post details of a **lost item**
- 📦 Post details of a **found item**
- 🖼️ Upload images for better identification
- ✏️ Edit or delete item posts
- 🔎 Search for items using keywords
- 🗂️ Filter by category and location
- 🛑 Claim an item
- 💬 Chat system for coordination
- ✅ Item verification before handover
- 🔔 Push and email notifications
- 🧑‍⚖️ Admin review and approval of posts
- 🚫 Report and block users
- 📊 Reports on frequently lost items
- 📈 User engagement statistics

---

## ⚠️ Known Limitation

- **Image uploads from mobile devices are not supported** in the current hosted version.
- This is a **top priority** item on our development roadmap.

---

## 📅 Agile Progress

This project follows **Agile** principles with incremental delivery.  
Each user story maps to a planned sprint goal. Core features like posting and searching were delivered early, and the app continues to iterate and grow.

---

## 📦 Run the App Locally

### 1. Clone the Repository
```bash
git clone https://github.com/SvAkshayKumar/LostAndFoundAppRVU.git
cd LostAndFoundAppRVU
```

### 2. Start the Backend Server
```bash
cd server
npm install
node index.js
```

> Server uses **better-sqlite3** for OTP generation with auto-initializing SQLite. The main backend uses **Supabase** for application data.

### 3. Start the Frontend App
```bash
cd ../client
npm install
npm start
```
Visit the app at: [http://localhost:3000](http://localhost:3000)

---

## 📂 Environment Variables

Create a `.env` file inside the `server/` directory with:

```env
PORT=5000
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@example.com
EMAIL_PASS=your-app-password
```

---

## 🧰 Terms & Conditions

This project includes a simple **Terms & Conditions** page:

- **Live:** https://svakshaykumar.github.io/LostAndFound-TandC/

---

## 🤝 Contribution & Contact

We welcome and encourage **contributions** to improve the app!

If you have suggestions, want to report issues, or would like to build on this project — we’d love to hear from you.

📧 **Email:** adevadiga2005@gmail.com  
💬 **Message:** Fork this project, suggest enhancements, or submit pull requests. Your contributions are not only welcome but deeply appreciated. Whether it’s a bug fix, feature addition, or design improvement — **every bit helps!**

---

Thank you for checking out the Lost and Found App.  
Whether you're a user or a developer, **your support makes this project better.** 💙

