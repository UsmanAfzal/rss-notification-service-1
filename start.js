const bills = require('./sources/bills.js'),
      committees = require('./sources/committees.js'),
      dynamodb = require('./dynamodb/dynamodb.js'),
      healthcheck = require('./helpers/healthcheck.js'),
      helpers = require('./helpers/helpers.js'),
      mailchimp = require('./mailchimp/mailchimp.js'),
      poller = require('./poller/poller.js'),
      ses = require('./ses/ses.js');

async function setup() {
  console.info('Setting up DynamoDB...');
  await dynamodb.setup();
  console.info('Retrieving all sources (public_bill, private_bill, committees)...');
  const sources = await Promise.all([
    bills.getAll('https://services.parliament.uk/Bills/AllPublicBills.rss', 'public_bill'),
    bills.getAll('https://services.parliament.uk/Bills/AllPrivateBills.rss', 'private_bill'),
    committees.getBase('https://www.parliament.uk/business/committees/committees-a-z/').then((res) => committees.getRssFeeds(res)).then((res) => committees.getFeedInformation(res))
  ]);
  console.info('Populating DynamoDB...');
  await dynamodb.populate([].concat.apply([], sources));
  await helpers.sleep(1000); // Wait a second before continuing (connection cooldown)
}

function send(subscribers, changes) {
  for (let i = 0; i < changes.length; i++) {
    const recipients = mailchimp.filterUsers(subscribers, 'test').map(r => r.email_address); // Todo after test: change to to changes[i].aeid
    const changeHtml = changes[i].items.map(r => {
      return `<ul style="margin: 0; list-style-position: outside; list-style: none; padding: 0 0 20px;">
                <li style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0;"><a href="#" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; color: #2B57AB;">${r.title}</a></li>
                <li style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0;">${r.pubDate}</li>
                <li style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0;">${r.content}</li>
              </ul>`;
    }).join('\n\n');
    const changeText = changes[i].items.map(r => {
      return `* ${r.title} (#)
              * ${r.pubDate}
              * ${r.content}`;
    }).join('\n\n');

    const html = `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <!-- Allows template-specific stylesheet appends-->
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <meta name="viewport" content="width=device-width"><!--[if mso]>
        <style type="text/css">body, table, td {font-family: "Helvetica Neue", Helvetica, Arial, sans-serif !important;}
        </style><![endif]-->
        <style>
    a:hover {
      color: #7592C8;
    }
    @media only screen and (max-width: 599px) {
      #templatePreheader td {
        padding: 6px !important;
      }

      .header__image {
        max-width: 100% !important;
      }
    }
    @media only screen and (max-width: 599px) {
      .table-of-contents ul {
        padding-top: 20px !important;
      }
    }
    @media only screen and (max-width: 599px) {
      .columns {
        width: 100% !important;
      }

      .columns table,
    .columns tbody,
    .columns tr,
    .columns td {
        display: block !important;
        float: none !important;
      }

      .columns__full,
    .columns__half,
    .columns__third,
    .columns__twothirds,
    .columns__fourth {
        display: block !important;
        width: auto !important;
        float: none !important;
      }

      .columns__full img,
    .columns__half img,
    .columns__third img,
    .columns__twothirds img,
    .columns__fourth img {
        max-width: 100% !important;
      }

      .columns__half img,
    .columns__twothirds img {
        padding-bottom: 20px !important;
      }

      .columns__third img,
    .columns__fourth img {
        padding-bottom: 10px !important;
      }

      .columns__third p,
    .columns__fourth p {
        padding-bottom: 20px !important;
      }
    }
    @media only screen and (max-width: 599px) {
      #templateFooter a {
        font-size: 0 !important;
      }

      #templateLegal td {
        padding: 18px 6px !important;
      }
    }
    </style>
      </head>
      <body leftmargin="0" marginheight="0" marginwidth="0" offset="0" topmargin="0" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background: #F8F7F7; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-style: normal; font-variant: normal; font-weight: 400; line-height: 20px; color: #4D4D4D;">
        <center>
          <table align="center" border="0" cellpadding="0" cellspacing="0" height="100%" id="bodyTable" width="560" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; max-width: 560px; border-collapse: collapse;">
            <tr>
              <td align="center" id="bodyCell" valign="top" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                <table border="0" cellpadding="0" cellspacing="0" id="templateContainer" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse;">
                  <tr>
                    <td align="center" valign="top" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                      <table border="0" cellpadding="0" cellspacing="0" id="templatePreheader" width="100%" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 11px; color: #717171; border-collapse: collapse;">
                        <tr>
                          <td style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 6px 0;"></td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" valign="top" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse;">
                        <tr>
                          <td class="header" valign="top" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt;"><img class="header__image" src="images/header_ukp.png" width="600px" mc:edit="header_image" style="-ms-interpolation-mode: bicubic; max-width: 600px; vertical-align: middle;">
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" valign="top" id="templateContent" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background: #fff; padding-bottom: 20px;">
                      <table border="0" cellpadding="10" cellspacing="0" width="100%" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse;">
                        <!-- Components appended here to individual template-->
                        <tr>
                          <td class="row" align="center" valign="top" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding-top: 20px;">
                            <table class="columns" border="0" cellpadding="0" cellspacing="0" width="100%" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 14px; border-collapse: collapse;">
                              <tr>
                                <td class="columns__full" align="left" valign="top" width="100%" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 0 10px;">
                                  <p style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0; padding-top: 20px;">You are subscribed to ${changes[i].title} updates from Parliament.</p>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr mc:repeatable="content" mc:variant="Divider">
                          <td class="row" align="center" valign="top" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding-top: 20px;">
                            <table class="divider" border="0" cellpadding="0" cellspacing="0" width="100%" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse;">
                              <tr>
                                <td style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 0 10px;">
                                  <hr style="border: 0; border-color: #CBC9CD; border-top-width: 2px; border-top-style: solid; margin: 0;">
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                        <tr>
                          <td class="row" align="center" valign="top" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding-top: 20px;">
                            <table class="columns" border="0" cellpadding="0" cellspacing="0" width="100%" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 14px; border-collapse: collapse;">
                              <tr>
                                <td class="columns__full" align="left" valign="top" width="100%" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 0 10px;">
                                  ${changeHtml}
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" valign="top" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                      <table border="0" cellpadding="0" cellspacing="0" id="templateFooter" width="100%" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; background: #EBE9E8; border-top: 1px solid #CBC9CD; border-collapse: collapse;">
                        <tr>
                          <td valign="center" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 12px;"><a target="_blank" href="https://www.parliament.uk/" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; display: inline-block; vertical-align: middle; font-size: 12px; line-height: 16px; color: #4D4D4D;"><img src="images/portcullis@2x.png" width="32px" style="-ms-interpolation-mode: bicubic; border: 0; display: inline-block; padding-right: 10px;"></a></td>
                          <td valign="center" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 12px; text-align: right;" align="right"><a target="_blank" href="https://twitter.com/ukparliament" mc:hideable="mc:hideable" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; display: inline-block; vertical-align: middle; font-size: 12px; line-height: 16px; color: #4D4D4D;"><img class="socialIcon" src="images/twitter@2x.png" width="32px" style="-ms-interpolation-mode: bicubic; border: 0; display: inline-block; padding-right: 10px; vertical-align: middle; padding-left: 18px; max-width: 16px;">Twitter</a><a target="_blank" href="https://facebook.com/ukparliament" mc:hideable="mc:hideable" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; display: inline-block; vertical-align: middle; font-size: 12px; line-height: 16px; color: #4D4D4D;"><img class="socialIcon" src="images/facebook@2x.png" width="32px" style="-ms-interpolation-mode: bicubic; border: 0; display: inline-block; padding-right: 10px; vertical-align: middle; padding-left: 18px; max-width: 16px;">Facebook</a><a target="_blank" href="https://instagram.com/ukparliament" mc:hideable="mc:hideable" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; display: inline-block; vertical-align: middle; font-size: 12px; line-height: 16px; color: #4D4D4D;"><img class="socialIcon" src="images/instagram@2x.png" width="32px" style="-ms-interpolation-mode: bicubic; border: 0; display: inline-block; padding-right: 10px; vertical-align: middle; padding-left: 18px; max-width: 16px;">Instagram</a></td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" valign="top" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                      <table border="0" cellpadding="0" cellspacing="0" id="templateLegal" width="100%" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-size: 12px; line-height: 20px; color: #717171; border-collapse: collapse;">
                        <tr>
                          <td valign="center" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 18px 0 0;"><a href="https://email-subscriptions.parliament.uk/" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; color: #717171;">Unsubscribe</a> | <a href="https://email-subscriptions.parliament.uk/" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; color: #717171;">Manage your email subscriptions</a><br><br>
                            <p style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0;">View our <a href="https://www.parliament.uk/site-information/data-protection/uk-parliament-email-privacy-policy/" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; color: #717171;">privacy policy</a>
                            </p><br>
                            <p style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; margin: 0; padding: 0;">Our address is: Houses of Parliament, Westminster, London, SW1A 0AA</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </center>
      </body>
    </html>`;

    const text = `You are subscribed to ${changes[i].title} updates from Parliament.

------------------------------------------------------------

${changeText}

============================================================
** (https://www.parliament.uk/)
** Twitter (https://twitter.com/ukparliament)
** Facebook (https://facebook.com/ukparliament)
** Instagram (https://instagram.com/ukparliament)

 Unsubscribe (https://email-subscriptions.parliament.uk/) | Manage your email subscriptions (https://email-subscriptions.parliament.uk/)

View our privacy policy (https://www.parliament.uk/site-information/data-protection/uk-parliament-email-privacy-policy/)

Our address is: Houses of Parliament, Westminster, London, SW1A 0AA`

    return ses.send({
      html,
      text,
      subject: `There has been an update to ${changes[i].title}`,
      recipients
    });
  }
}

async function start() {
  console.info('Retrieving all topics from DynamoDB...');
  const topics = await dynamodb.getAllTopics();
  console.info('Requesting feeds... this may take a few minutes');
  const request = await poller.requestFeeds(topics);
  console.info('Checking feeds... this may take a few minutes');
  const changes = await poller.checkFeeds(request);
  console.info('Any changes?:', changes);
  if(changes.length) {
    const subscribers = await mailchimp.getSubscribers();
    send(subscribers, changes);
  }
  await helpers.sleep(600000);
  return start();
}

setup().then(start);
