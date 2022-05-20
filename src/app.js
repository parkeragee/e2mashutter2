/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

const AWS = require('aws-sdk')
const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const chromium = require('chrome-aws-lambda');

const pageURL = process.env.TARGET_URL
const agent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36'

exports.handler = async (event, context) => {

  let result = null;
  let browser = null;

  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });

    let page = await browser.newPage();
    await page.setViewport({
        width: 1024,
        height: 1024,
        isMobile: false,
    })
    await page.setUserAgent(agent)
    const query = event.queryStringParameters;

    if (!Boolean(query.target)) {
        throw new Error('No target url defined')
    }

    const waitUntil = Boolean(query.waitUntil) ? query.waitUntil : 'load';
    await page.goto(query.target, {
        waitUntil,
    })
    const buffer = await page.screenshot({ fullPage: true })

    // upload the image using the current timestamp as filename
    const s3result = await s3
      .upload({
        Bucket: process.env.S3_BUCKET,
        Key: `${'hello'}.png`,
        Body: buffer,
        ContentType: 'image/png',
        ACL: 'public-read'
      })
      .promise()
    
    result = s3result.Location;
    
    await page.close();
    await browser.close();
    
  } catch (error) {
    console.log(error)
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }

  return result;
}
