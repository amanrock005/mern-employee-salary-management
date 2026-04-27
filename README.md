In order to run this project locally, simply fork and clone the repository or download as zip and unzip on your machine.

- Open the project in your prefered code editor.
- Go to terminal -> New terminal (If you are using VS code)
- Split your terminal into two (run the Frontend on one terminal and the server on the other terminal)

In the first terminal

```
$ cd Fronted
$ npm install (to install Frontend-side dependencies)
$ npm run dev(to start the Frontend)
```

In the second terminal

- Create your MySQL database, which you will use as your database
- Supply the following credentials

```
#  --- .env  ---

APP_PORT =5000
SESS_SECRET =

```

```
# --- Terminal ---

$ cd Backend
$ npm install (to install Backend-side dependencies)
$ npm start (to start the Backend)

```

---

## Additional project notes (tickets / decisions)

### Which HRMS I chose and why (one line)

- **HRMS choice**: **In-repo/custom HRMS module** (this app) — chosen to match the existing codebase + database models without introducing a new external HRMS dependency.

### Which AI tools I used and for what

- **Cursor AI agent (GPT-5.2)**: code search, implementation, refactors, validation logic, and UI changes.

### Tickets handled differently than described (and why)

- **CSV export (employee list)**: the ticket asked for `department` and `salary` in the CSV; the existing data model doesn’t have explicit `department`/salary on employees, so:
  - **Department** is exported from employee `jabatan`
  - **Salary** is exported by joining employee `jabatan` to `data_jabatan.gaji_pokok`
  - This matches the current schema and avoids inventing new fields.
- **Worker designation field**: the app does not auto-run Sequelize migrations (`db.sync()` is commented out), so adding `designation` requires a **DB column** to exist in MySQL before saving will work.
