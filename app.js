// ==========================================
// SUPABASE CONNECTION
// ==========================================

// We will add your Supabase information here later.

const SUPABASE_URL = "https://oixzobskfhjuojongniv.supabase.co";
const SUPABASE_KEY = "sb_publishable_1YBLcQmodses0o-5LbFp7g_6hbkQ4IP";

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
    document.getElementById("generate-page").classList.remove("hidden");
    loadQRGenerationStatus();
}


    if (page === "scan") {

        document
            .getElementById("scan-page")
            .classList.remove("hidden");

        startScanner();

    }
    
   if (page === "qrcodes") {

    document
        .getElementById("qrcodes-page")
        .classList.remove("hidden");

    loadQRCodes();
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

        const { data: settings, error: settingsError } =
        await supabaseClient
            .from("app_settings")
            .select("qr_generation_enabled")
            .eq("id", true)
            .single();

    if (settingsError) {
        console.error(settingsError);

        document.getElementById("generate-message").textContent =
            "Could not check QR generation status.";

        return;
    }

    if (!settings.qr_generation_enabled) {
        document.getElementById("generate-message").textContent =
            "QR generation is currently OFF.";

        return;
    }

    const name =
        document
            .getElementById("guest-name")
            .value
            .trim();

    const message =
        document.getElementById("generate-message");

    if (!name) {
        message.textContent =
            "Please enter the guest name.";
        return;
    }

    message.textContent =
        "Creating guest...";

    const { data, error } =
        await supabaseClient
            .rpc("create_guest", {
                p_guest_name: name
            });

    if (error) {
        console.error(error);

        message.textContent =
            error.message;

        return;
    }

    if (!data || data.length === 0) {
        message.textContent =
            "Guest was created, but no guest data was returned.";

        return;
    }

    const guest = data[0];

    const guestNumber =
        String(guest.guest_number)
            .padStart(3, "0");

    window.currentGuestNumber =
        guestNumber;

    // Clear previous QR
    const qrContainer =
        document.getElementById("qrcode");

    qrContainer.innerHTML = "";

    // Generate QR
    new QRCode(qrContainer, {
        text: guest.guest_code,
        width: 250,
        height: 250
    });

    // Wait for QR canvas to appear
    setTimeout(() => {

        const qrCanvas =
            qrContainer.querySelector("canvas");

        if (!qrCanvas) {
            message.textContent =
                "Guest created, but QR could not be generated.";

            return;
        }

        // Create number underneath QR
        const numberElement =
            document.createElement("div");

        numberElement.textContent =
            guestNumber;

        numberElement.style.fontSize =
            "28px";

        numberElement.style.fontWeight =
            "bold";

        numberElement.style.textAlign =
            "center";

        numberElement.style.marginTop =
            "10px";

        qrContainer.appendChild(
            numberElement
        );

        // Show QR result
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

    }, 200);
}

// ==========================================
// DOWNLOAD QR
// ==========================================

function downloadQR() {

    const qrCanvas =
        document.querySelector("#qrcode canvas");

    if (!qrCanvas) {
        alert("Generate a QR code first.");
        return;
    }

    const guestNumber =
        window.currentGuestNumber || "000";

    const finalCanvas =
        document.createElement("canvas");

    finalCanvas.width = 250;
    finalCanvas.height = 300;

    const ctx = finalCanvas.getContext("2d");

    // White background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 250, 300);

    // QR code
    ctx.drawImage(
        qrCanvas,
        0,
        0,
        250,
        250
    );

    // Guest number
    ctx.fillStyle = "black";
    ctx.font = "bold 28px Arial";
    ctx.textAlign = "center";

    ctx.fillText(
        guestNumber,
        125,
        285
    );

    // Download
    const link = document.createElement("a");

    link.download = `guest-${guestNumber}.png`;

    link.href =
        finalCanvas.toDataURL("image/png");

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
async function manualCheckIn() {

    const input =
        document.getElementById("manual-guest-number");

    const result =
        document.getElementById("manual-result");

    const number =
        parseInt(input.value, 10);

    if (!number) {
        result.textContent =
            "Please enter a guest number.";
        return;
    }

    result.textContent =
        "Checking guest...";

    const { data, error } =
        await supabaseClient.rpc(
            "check_in_guest_by_number",
            {
                p_guest_number: number
            }
        );

    if (error) {
        console.error(error);

        result.textContent =
            error.message;

        return;
    }

    if (!data || data.length === 0) {
        result.textContent =
            "Guest not found.";
        return;
    }

    const guest = data[0];

    if (guest.success) {

        result.textContent =
            "✓ Entry Approved — " +
            guest.guest_name;

        input.value = "";

        loadStats();
        loadGuests();

    } else {

        result.textContent =
            "✗ " + guest.message +
            (guest.guest_name
                ? " — " + guest.guest_name
                : "");
    }
}
async function loadQRCodes() {

    const gallery = document.getElementById("qr-gallery");

    if (!gallery) return;

    gallery.innerHTML = "Loading QR codes...";

    const { data, error } = await supabaseClient
        .from("guests")
        .select("guest_number, guest_name, guest_code, used_at")
        .order("guest_number", { ascending: true });

    if (error) {
        console.error(error);
        gallery.innerHTML = "Could not load QR codes.";
        return;
    }

    if (!data || data.length === 0) {
        gallery.innerHTML = "No guests yet.";
        return;
    }

    gallery.innerHTML = "";

    data.forEach(guest => {

        const card = document.createElement("div");

        card.className = "qr-card";

        if (guest.used_at) {
            card.classList.add("used");
        }

        const qrBox = document.createElement("div");

        qrBox.className = "qr-image";

        new QRCode(qrBox, {
            text: guest.guest_code,
            width: 180,
            height: 180
        });

        const number = document.createElement("div");

        number.className = "qr-number";

        number.textContent =
            "#" + String(guest.guest_number).padStart(3, "0");

        const name = document.createElement("div");

        name.className = "qr-name";

        name.textContent = guest.guest_name;

        card.appendChild(qrBox);
        card.appendChild(number);
        card.appendChild(name);

        if (guest.used_at) {

            const used = document.createElement("div");

            used.className = "qr-used";

            used.textContent = "USED";

            card.appendChild(used);
        }

        gallery.appendChild(card);
    });
}

async function toggleQRGeneration() {

    const button =
        document.getElementById("qr-generation-toggle");

    const { data: settings, error: settingsError } =
        await supabaseClient
            .from("app_settings")
            .select("qr_generation_enabled")
            .eq("id", true)
            .single();

    if (settingsError) {
        console.error(settingsError);

        document.getElementById("generate-message").textContent =
            "Could not check QR generation status.";

        return;
    }

    const newStatus =
        !settings.qr_generation_enabled;

    const { error } =
        await supabaseClient
            .from("app_settings")
            .update({
                qr_generation_enabled: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq("id", true);

    if (error) {
        console.error(error);

        document.getElementById("generate-message").textContent =
            "Could not change QR generation status.";

        return;
    }

    button.textContent =
        newStatus ? "ON" : "OFF";

    document.getElementById("generate-message").textContent =
        newStatus
            ? "QR generation is now ON."
            : "QR generation is now OFF.";
}
async function loadQRGenerationStatus() {

    const button =
        document.getElementById("qr-generation-toggle");

    if (!button) {
        return;
    }

    const { data, error } =
        await supabaseClient
            .from("app_settings")
            .select("qr_generation_enabled")
            .eq("id", true)
            .single();

    if (error) {
        console.error(error);
        return;
    }

    button.textContent =
        data.qr_generation_enabled
            ? "ON"
            : "OFF";
}
