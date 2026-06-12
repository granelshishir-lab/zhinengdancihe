async function run() {
  try {
    const params = new URLSearchParams();
    params.append("email", "granelshishir@gmail.com");
    const res = await fetch("https://kvdb.io/", {
      method: "POST",
      body: params
    });
    console.log("Status:", res.status);
    console.log("Status Text:", res.statusText);
    
    console.log("\n--- Headers ---");
    for (const [key, val] of res.headers.entries()) {
      console.log(`${key}: ${val}`);
    }

    const text = await res.text();
    console.log("\n--- Body ---");
    console.log(text);
  } catch (err) {
    console.error(err);
  }
}
run();
