/*
 * Copyright (c) 2022, salesforce.com, inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */


function postData(url, data, cb) {
  var myHeaders = new Headers();
  myHeaders.append('Content-Type', 'application/json');

  if (cb !== undefined) {
    fetch(`${vis.domain}${url}`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body:JSON.stringify(data)
    }).then((data) => {
      if(data.status !== 200 || !data.ok) {
        // remove the progressing
        d3.select('#progress')
            .style("display", "none");
        // show error information
        d3.select('#error_block')
          .style("display", "block");
        throw new Error(`server returned ${data.status}${data.ok ? " ok" : ""}`);
      }
      const ct = data.headers.get("content-type");
      return data.json();
    }).then((cb));
  } else {
    fetch(`${domain}${url}`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "DELETE, POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With"
      },
      body:JSON.stringify(data)
    }).then((res) => {
      console.log(res);
    });
  }
}