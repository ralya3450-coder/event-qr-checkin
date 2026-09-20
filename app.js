// ==========================================
// SUPABASE CONNECTION
// ==========================================

// We will add your Supabase information here later.

const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);


// ==========================================
// LOGIN
// ==========================================

async function login() {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const message =
        document.getElementById("login-message");

    message.textContent = "Logging in...";


    const { error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });


    if (error) {

        message.textContent =
            error.message;

        return;
    }


    showAdmin();
}


// ==========================================
// LOGOUT
// ==========================================

async function logout() {

    await supabaseClient.auth.signOut();


    document
        .getElementById("admin-section")
        .classList.add("hidden");


    document
        .getElementById("login-section")
        .classList.remove("hidden");
}


// ==========================================
// SHOW ADMIN AREA
// ==========================================

function showAdmin() {

    document
        .getElementById("login-section")
        .classList.add("hidden");


    document
        .getElementById("admin-section")
        .classList.remove("hidden");


    loadStats();
    loadGuests();
}


// ==========================================
// PAGE NAVIGATION
// ==========================================

function showPage(page) {


    document
        .getElementById("generate-page")
        .classList.add("hidden");


    document
        .getElementById("scan-page")
        .classList.add("hidden");


    document
        .getElementById("guests-page")
        .classList.add("hidden");


    if (page === "generate") {

        document
            .getElementById("generate-page")
            .classList.remove("hidden");

    }


    if (page === "scan") {

        document
            .getElementById("scan-page")
            .classList.remove("hidden");

        startScanner();

    }


    if (page === "guests") {

        document
            .getElementById("guests-page")
            .classList.remove("hidden");

        loadGuests();

    }
}


// ==========================================
// CREATE GUEST + QR CODE
// ==========================================

async function createGuest() {

    const name =
        document
            .getElementById("guest-name")
            .value
            .trim();


    const message =
        document
            .getElementById("generate-message");


    if (!name) {

        message.textContent =
            "Please enter the guest name.";

        return;
    }


    message.textContent =
        "Creating guest...";


    const { data, error } =
        await supabaseClient
            .from("guests")
            .insert({
                guest_name: name
            })
            .select()
            .single();


    if (error) {

        message.textContent =
            error.message;

        return;
    }


    // Clear previous QR

    document
        .getElementById("qrcode")
        .innerHTML = "";


    // Generate new QR

    new QRCode(
        document.getElementById("qrcode"),
        {
            text: data.guest_code,
            width: 250,
            height: 250
        }
    );


    document
        .getElementById("qr-result")
        .classList.remove("hidden");


    message.textContent =
        "QR code created successfully.";


    document
        .getElementById("guest-name")
        .value = "";


    loadStats();
    loadGuests();
}


// ==========================================
// DOWNLOAD QR
// ==========================================

function downloadQR() {

    const canvas =
        document.querySelector("#qrcode canvas");


    if (!canvas) {

        alert("Generate a QR code first.");

        return;
    }


    const link =
        document.createElement("a");


    link.download =
        "guest-qr.png";


    link.href =
        canvas.toDataURL("image/png");


    link.click();
}


// ==========================================
// QR SCANNER
// ==========================================

let scanner = null;


function startScanner() {

    if (scanner) {
        return;
    }


    scanner =
        new Html5Qrcode("reader");


    scanner.start(

        {
            facingMode: "environment"
        },

        {
            fps: 10,

            qrbox: {
                width: 250,
                height: 250
            }
        },

        qrCodeMessage => {

            checkGuest(qrCodeMessage);

        },

        errorMessage => {

            // Normal scanning errors are ignored.

        }

    );
}


// ==========================================
// CHECK QR CODE
// ==========================================

async function checkGuest(code) {


    if (scanner) {

        await scanner.pause(true);

    }


    const result =
        document.getElementById("scan-result");


    result.innerHTML =
        "<p>Checking QR code...</p>";


    const { data, error } =
        await supabaseClient.rpc(
            "check_in_guest",
            {
                p_guest_code: code
            }
        );


    if (error) {

        result.innerHTML = `
            <div class="error">

                <h2>System Error</h2>

                <p>
                    ${error.message}
                </p>

            </div>
        `;

        return;
    }


    const response = data[0];


    // ======================================
    // VALID + UNUSED
    // ======================================

    if (response.success) {


        result.innerHTML = `

            <div class="success">

                <h2>
                    ✓ ENTRY APPROVED
                </h2>

                <p>
                    Guest:
                    <strong>
                        ${response.guest_name}
                    </strong>
                </p>

                <p>
                    Checked in:
                    ${new Date(
                        response.checked_in_at
                    ).toLocaleTimeString()}
                </p>

            </div>

        `;


        loadStats();
        loadGuests();

    }


    // ======================================
    // INVALID OR ALREADY USED
    // ======================================

    else {


        result.innerHTML = `

            <div class="error">

                <h2>
                    ✕ ${response.message}
                </h2>

                <p>

                    Guest:
                    ${response.guest_name || "Unknown"}

                </p>

                ${
                    response.checked_in_at

                    ?

                    `<p>
                        First scanned:
                        ${new Date(
                            response.checked_in_at
                        ).toLocaleTimeString()}
                    </p>`

                    :

                    ""
                }

            </div>

        `;

    }


    // Allow another scan after 3 seconds

    setTimeout(() => {

        if (scanner) {

            scanner.resume();

        }

    }, 3000);
}


// ==========================================
// STATISTICS
// ==========================================

async function loadStats() {


    const { count: total } =
        await supabaseClient
            .from("guests")
            .select("*", {
                count: "exact",
                head: true
            });


    const { count: entered } =
        await supabaseClient
            .from("guests")
            .select("*", {
                count: "exact",
                head: true
            })
            .not(
                "used_at",
                "is",
                null
            );


    const remaining =
        (total || 0) -
        (entered || 0);


    document
        .getElementById("total-guests")
        .textContent = total || 0;


    document
        .getElementById("entered-guests")
        .textContent = entered || 0;


    document
        .getElementById("remaining-guests")
        .textContent = remaining;
}


// ==========================================
// GUEST LIST
// ==========================================

async function loadGuests() {


    const { data, error } =
        await supabaseClient
            .from("guests")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    const list =
        document.getElementById(
            "guest-list"
        );


    if (error) {

        list.innerHTML =
            `<p>${error.message}</p>`;

        return;
    }


    list.innerHTML =
        data.map(guest => {


            const status =
                guest.used_at
                    ? "✓ Entered"
                    : "Not entered";


            const time =
                guest.used_at

                    ?

                    new Date(
                        guest.used_at
                    ).toLocaleTimeString()

                    :

                    "—";


            return `

                <div class="guest-row">

                    <strong>
                        ${guest.guest_name}
                    </strong>

                    <span>
                        ${status}
                        &nbsp;
                        ${time}
                    </span>

                </div>

            `;

        }).join("");
}


// ==========================================
// CHECK EXISTING LOGIN SESSION
// ==========================================

async function checkSession() {


    const {
        data: {
            session
        }
    } =
        await supabaseClient
            .auth
            .getSession();


    if (session) {

        showAdmin();

    }
}


// Start the application

checkSession();
