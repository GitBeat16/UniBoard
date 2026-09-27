/**
 * Where the "already seen the splash this session" flag lives.
 *
 * A plain module on purpose: the server layout reads this to write its
 * before-paint script, and an export from a "use client" file reaches a server
 * component as a client reference, not as the string.
 */
export const SPLASH_KEY = "uniboard:splash";

/**
 * Runs while the HTML is still being parsed, before the splash is painted: a
 * reload within the session hides it, and a switched-off Flora is left out of
 * it. It only sets attributes on <html>, so React's tree is untouched.
 */
export const BEFORE_PAINT = `try{var d=document.documentElement;if(sessionStorage.getItem(${JSON.stringify(SPLASH_KEY)})==="1")d.dataset.splash="seen";if(localStorage.getItem("uniboard:flora")==="off")d.dataset.flora="off"}catch(e){}`;
