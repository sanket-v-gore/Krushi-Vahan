# 🚜 Krushi‑Vahan

**Smart Agriculture Vehicle Management System**

**Krushi‑Vahan** is a web-based application designed to streamline the management, tracking, and maintenance of agricultural vehicles used in farming operations.

---

## 🧡 Overview

Krushi‑Vahan provides farmers and agricultural managers with a centralized dashboard to:

* Add, edit, and view vehicle details
* Track maintenance schedules
* Assign vehicles to specific fields or tasks
* Monitor fuel usage and costs

The intuitive interface ensures efficient operational workflows and informed decision-making.

---

## ✨ Features

* **Vehicle Management**: Register new vehicles with make, model, capacity, etc.
* **Maintenance Tracking**: Schedule services, set reminders, and update logs.
* **Task Assignment**: Link vehicles to fields or jobs with timeline control.
* **Fuel & Cost Monitoring**: Log fuel refills, calculate total expenses.
* **Reporting**: Generate summaries of vehicle usage and maintenance metrics.

---

## 📄 Tech Stack

| Component         | Tech/Libraries        |
| ----------------- | --------------------- |
| Backend           | node.js               |
| Database          | MongoDB               |
| Frontend          | HTML, CSS, JavaScript |
| Build & Dev Tools | VS code, Git            |

---

## ⚙️ Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/sanket-v-gore/Krushi-Vahan.git
   cd Krushi-Vahan
   ```

2. **Build & Run**

   ```bash
   node install
   node server.js
   ```

3. **Access the App**
   Visit `http://localhost:8080` in your browser.

---

## 🔍 Usage

* **Add Vehicle**: Navigate to *Vehicles → Add New*, fill in details.
* **Maintenance Logs**: Go to *Maintenance → Add Entry*, select vehicle, input date & remarks.
* **Assign Tasks**: Use *Tasks → Create*, set vehicle and field assignment.
* **View Reports**: Access *Reports* to generate usage summaries and charts.

---

## 📦 API Endpoints

| Endpoint         | Method | Description                |
| ---------------- | ------ | -------------------------- |
| `/vehicles`      | GET    | List all vehicles          |
| `/vehicles/{id}` | GET    | Get a specific vehicle     |
| `/vehicles`      | POST   | Register a new vehicle     |
| `/maintenance`   | POST   | Create maintenance entry   |
| `/tasks`         | POST   | Assign a vehicle to a task |

*(Refer to the Swagger/OpenAPI docs for full details once integrated.)*

---

## 📚 Contributing

Contributions are welcome!
Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before creating issues or submitting pull requests.

---

## 🔒 License

Released under the [MIT License](./LICENSE).

---

## 📧 Contact

**Sanket Gore**
Email: [sanketgore1998@gmail.com](mailto:gores5250@gmail.com)
[LinkedIn](https://www.linkedin.com/in/sanket-gore-a471282a0/) • [GitHub](https://github.com/sanket-v-gore)

---

🌟 *Thanks for checking out **Krushi‑Vahan**! Feedback and suggestions are always welcome.*
