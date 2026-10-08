import { Link } from 'react-router-dom';
import { ADSENSE_CLIENT, CONTACT_EMAIL, SITE_URL, UPDATED } from '../content';
import { openPrivacySettings } from '../lib/ads';

const Page = ({ children }: { children: React.ReactNode }) => (
  <article className="prose-fl mx-auto max-w-3xl pt-2">{children}</article>
);

const Ext = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} rel="noopener noreferrer" target="_blank">{children}</a>
);

const Mail = () => <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const HOST = SITE_URL.replace(/^https?:\/\//, '');

const Meta = () => <p>Last updated: {UPDATED}</p>;

const Related = ({ current }: { current: string }) => {
  const all = [
    ['/privacy', 'Privacy Policy'],
    ['/terms', 'Terms and Conditions'],
    ['/cookies', 'Cookie Policy'],
    ['/disclaimer', 'Disclaimer'],
  ].filter(([to]) => to !== current);
  return (
    <p>
      Related: {all.map(([to, label], i) => (
        <span key={to}>{i > 0 && ', '}<Link to={to}>{label}</Link></span>
      ))}.
    </p>
  );
};

/* ------------------------------------------------------------------ Privacy */

export function Privacy() {
  return (
    <Page>
      <h1>Privacy Policy</h1>
      <Meta />
      <p>
        This policy explains what Foldline (“Foldline”, “we”, “us”) does and does not collect when you use {HOST} and its PDF tools.
        The short version: your PDFs are processed on your own device and are never uploaded to us.
      </p>

      <h2>Your files</h2>
      <p>
        PDFs you open in Foldline are read and edited inside your browser. They are not uploaded to Foldline or to any third party,
        we cannot see them, and they are discarded when you close or reload the tab. This also applies to OCR, passwords and
        compression: the work happens on your device. Because we never receive your files, we cannot recover, restore or delete them for you.
      </p>

      <h2>Information we collect</h2>
      <p>
        Foldline has no accounts and does not ask for your name, email address or payment details. We do not knowingly collect
        any personal information through the tools themselves. The only information we receive is:
      </p>
      <ul>
        <li>
          <strong>Server and hosting logs.</strong> Like any website, the host that delivers our pages may automatically record technical data such
          as your IP address, browser type, device type, referring page and the pages requested. This is used for security, abuse
          prevention and keeping the site reliable.
        </li>
        <li>
          <strong>Messages you send us.</strong> If you email us, we receive your email address and whatever you choose to write. We use it only to reply and to
          improve Foldline. Please do not attach PDFs that contain sensitive information.
        </li>
        {ADSENSE_CLIENT && (
          <li>
            <strong>Advertising data.</strong> Our advertising partner, Google, collects and uses data to show and measure ads. See
            “Advertising” below.
          </li>
        )}
      </ul>

      <h2>Information stored on your device</h2>
      <p>
        Foldline saves a few small preferences in your browser’s local storage so the site remembers them on your next visit: your Light or Dark
        theme choice, whether files are named automatically, and whether you have seen a one-time tip. These stay on your device, are never sent to us, and
        can be cleared at any time in your browser settings. Details are on the <Link to="/cookies">Cookie Policy</Link> page.
      </p>

      <h2>Third-party services</h2>
      <ul>
        <li>
          <strong>Google Fonts.</strong> Fonts are loaded from Google, so your browser contacts Google’s servers when a page loads, and Google receives
          your IP address and browser details as part of that request.
        </li>
        <li>
          <strong>OCR engine.</strong> The first time you use OCR, your browser downloads the text-recognition engine and language data from a public
          content delivery network (unless this site hosts them itself) and caches them. Those requests reveal your IP address and the language you chose,
          never your PDF.
        </li>
        <li>
          <strong>Hosting.</strong> The website is delivered by a static hosting and content delivery provider, which processes request data as described above.
        </li>
        {ADSENSE_CLIENT && (
          <li>
            <strong>Google AdSense.</strong> Used to display advertising. Described below.
          </li>
        )}
      </ul>
      <p>These providers have their own privacy policies, and we do not control how they handle data collected through their services.</p>

      <h2>Passwords</h2>
      <p>
        When a PDF asks for a password, what you type is used inside your browser to open that file and is then discarded. It is not
        sent to Foldline or anyone else. The same goes for a password you choose in Add password: it is used in your browser to encrypt the copy
        and is never stored or sent. Foldline cannot recover a forgotten password.
      </p>

      {ADSENSE_CLIENT && (
        <>
          <h2>Advertising</h2>
          <p>
            Foldline is free and is supported by advertising. We use Google AdSense to show ads. Third-party vendors, including Google, use cookies,
            device identifiers and similar technologies to serve ads based on your previous visits to this and other websites, and to measure
            how ads perform. Google’s use of advertising cookies enables it and its partners to serve ads to you based on your visit to Foldline
            and/or other sites on the internet.
          </p>
          <p>
            Ad scripts run on the page, separately from your PDFs. They have no access to the files you open or the content of your documents.
          </p>
          <p>You can control advertising in these ways:</p>
          <ul>
            <li>
              Opt out of personalized advertising in <Ext href="https://adssettings.google.com">Google Ads Settings</Ext>, or opt out of some
              third-party vendors’ use of cookies for personalized advertising at <Ext href="https://www.aboutads.info/choices/">aboutads.info</Ext>.
            </li>
            <li>
              In the European Economic Area, the United Kingdom and Switzerland, we use a consent message so you can choose whether personalized ads are used.
              You can change your choice at any time with the <button type="button" className="underline" onClick={openPrivacySettings}>Ad privacy settings</button> link in the footer.
            </li>
            <li>
              Learn how Google uses information from sites that use its services at <Ext href="https://policies.google.com/technologies/partner-sites">policies.google.com/technologies/partner-sites</Ext>,
              and read <Ext href="https://policies.google.com/technologies/ads">Google’s advertising policies</Ext>.
            </li>
            <li>Browser settings and extensions can also block or limit cookies and advertising identifiers.</li>
          </ul>
          <p>
            If you decline personalized ads, you may still see non-personalized ads, which use contextual information such as the page you are on
            and your general location instead of your earlier browsing.
          </p>
        </>
      )}

      <h2>How we use information</h2>
      <p>
        We use the limited information described above to deliver and secure the website, understand and fix problems, respond to your messages,
        and (where ads are shown) support the site through advertising. We do not sell your personal information in exchange for money, and we do not build profiles of
        visitors ourselves.
      </p>

      <h2>Legal bases (EEA, UK and Switzerland)</h2>
      <p>
        Where data protection law such as the GDPR applies, we rely on our legitimate interests to operate and secure the website, on your consent for
        personalized advertising and the related cookies, and on taking steps you ask for when you contact us.
      </p>

      <h2>Retention</h2>
      <p>
        We keep emails you send us only as long as needed to respond and to keep a reasonable record of support requests. Server logs are kept by
        our hosting provider for a limited time under its own retention schedule. Your PDFs are never retained because we never receive them.
      </p>

      <h2>Sharing and international transfers</h2>
      <p>
        We do not share personal information except with the service providers described above, when required by law, or to protect the rights, safety and security of Foldline and
        its visitors. Our providers may process data in countries other than your own, including countries that may not offer the same level of data protection. Where required, they rely on recognized safeguards for such transfers.
      </p>

      <h2>Your rights</h2>
      <p>
        Depending on where you live, you may have the right to access, correct, delete or export personal information held about you, to object to or restrict its
        processing, to withdraw consent, and to complain to your local data protection authority. Because we hold very little personal data, most requests will
        concern an email you sent us. To make a request, write to <Mail />. We may need to verify that the request comes from you.
      </p>
      <h3>California and other US states</h3>
      <p>
        We do not sell personal information for money. Some state laws treat the sharing of data with advertising partners for cross-context
        behavioral advertising as a “sale” or “sharing”. If you live in such a state, you can opt out through <Ext href="https://adssettings.google.com">Google Ads Settings</Ext>, the
        {' '}<Ext href="https://www.aboutads.info/choices/">Digital Advertising Alliance’s opt-out page</Ext>, or by enabling a browser signal such as Global Privacy Control. We do not discriminate against anyone for exercising these rights.
      </p>

      <h2>Security</h2>
      <p>
        The site is delivered over HTTPS, and keeping files on your device means they do not travel across the internet to us. No method of
        transmission or storage is perfectly secure, so we cannot guarantee absolute security of any information you send us by email.
      </p>

      <h2>Children</h2>
      <p>
        Foldline is a general-audience tool and is not directed at children under 13 (or under 16 where local law sets a higher age). We do not knowingly collect personal information from children.
        If you believe a child has sent us personal information, contact us and we will delete it.
      </p>

      <h2>Links to other sites</h2>
      <p>Foldline may link to other websites. We are not responsible for their content or privacy practices.</p>

      <h2>Changes to this policy</h2>
      <p>If this policy changes, we will update the date at the top of this page. Significant changes may also be noted on the site.</p>

      <h2>Contact</h2>
      <p>Questions about privacy can be sent to <Mail />.</p>
      <Related current="/privacy" />
    </Page>
  );
}

/* -------------------------------------------------------------------- Terms */

export function Terms() {
  return (
    <Page>
      <h1>Terms and Conditions</h1>
      <Meta />
      <p>
        These terms govern your use of Foldline at {HOST} (the “Service”). By using the Service you agree to them. If you do not agree, please do not use it.
      </p>

      <h2>The Service</h2>
      <p>
        Foldline provides free PDF tools that run in your web browser, including merging, reordering, splitting, cropping, compressing,
        OCR and adding or removing passwords. We may add, change or remove tools or features at any time without notice.
      </p>

      <h2>Who may use it</h2>
      <p>
        You must be old enough to form a binding agreement where you live, or have a parent or guardian’s permission. You are responsible for
        the device and browser you use and for complying with the laws that apply to you.
      </p>

      <h2>Your files and your responsibility</h2>
      <p>
        Your files stay on your device and are processed there. You keep all rights in them, and we claim none. You are responsible for the files you open, for
        having the right to use and modify them, and for keeping your own backups. Foldline never changes your original file: it creates a new one for you to download.
      </p>
      <p>
        Because processing happens on your device, results depend on your browser, device memory and the file itself. Very large or damaged PDFs may fail to open or may produce unexpected output.
        Always check the result before you rely on it or send it to anyone.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the Service to break any law or infringe anyone’s rights, including copyright and privacy rights;</li>
        <li>use it to access, unlock or remove protection from documents you are not entitled to open. The password tools work only when you know the password, and you must have the right to remove or change a document’s protection;</li>
        <li>interfere with, overload or attempt to disrupt the website or its hosting, or attempt to bypass security measures;</li>
        <li>scrape or copy the website at a rate or in a manner that harms its operation, or misrepresent the website as your own;</li>
        <li>use the Service to create or distribute malware, or deceptive or fraudulent documents.</li>
      </ul>

      <h2>Intellectual property</h2>
      <p>
        The Foldline name, logo, design, text and original code are owned by Foldline or its licensors and are protected by applicable intellectual property laws.
        The Service also uses open-source software, such as pdf-lib, pdf.js, qpdf and Tesseract, which remains under its own licenses. You may use the
        Service for personal or business purposes, but you may not copy, resell or redistribute the website itself without permission.
      </p>

      <h2>Advertising and third-party services</h2>
      <p>
        {ADSENSE_CLIENT
          ? 'The Service is supported by advertising provided by Google AdSense. Ads are provided by third parties, and we are not responsible for their content or for products and services they promote. Any dealings you have with advertisers are between you and them. '
          : ''}
        The Service may link to or rely on third-party services such as fonts and content delivery networks. We are not responsible for those services. See the{' '}
        <Link to="/privacy">Privacy Policy</Link> and <Link to="/cookies">Cookie Policy</Link>.
      </p>
      <p>You agree not to click ads on the Service for any reason other than genuine interest, and not to use automated means to generate clicks or impressions.</p>

      <h2>No warranty</h2>
      <p>
        The Service is provided “as is” and “as available”, without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose,
        accuracy, non-infringement, or that it will be uninterrupted, error-free or free of harmful components. See also the <Link to="/disclaimer">Disclaimer</Link>.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, Foldline and its operators will not be liable for any indirect, incidental, special, consequential or punitive damages, or for any loss
        of data, files, profits, revenue or goodwill, arising from your use of or inability to use the Service, even if we have been told such loss is possible. Where liability cannot be excluded,
        it is limited to the greatest extent the law allows. Nothing in these terms limits liability that cannot lawfully be limited.
      </p>

      <h2>Indemnity</h2>
      <p>
        You agree to be responsible for any claim or loss arising from your misuse of the Service or your breach of these terms, including processing files you have no right to use.
      </p>

      <h2>Availability and changes</h2>
      <p>
        We may suspend, change or discontinue any part of the Service at any time. We may update these terms from time to time; the date above shows the latest version, and continuing to
        use the Service after a change means you accept the updated terms.
      </p>

      <h2>Termination</h2>
      <p>You can stop using the Service at any time. We may restrict access for anyone who breaches these terms or abuses the Service.</p>

      <h2>General</h2>
      <p>
        These terms, together with the Privacy Policy, Cookie Policy and Disclaimer, are the entire agreement between you and Foldline about the Service. If any part is found unenforceable, the rest remains in effect.
        Our failure to enforce a provision is not a waiver of it. These terms are governed by the laws that apply to the Service’s operator, and mandatory consumer protection rights where you live are not affected.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms can be sent to <Mail />.</p>
      <Related current="/terms" />
    </Page>
  );
}

/* ------------------------------------------------------------------ Cookies */

export function Cookies() {
  return (
    <Page>
      <h1>Cookie Policy</h1>
      <Meta />
      <p>
        This page explains how Foldline and its partners use cookies and similar technologies such as local storage, and the choices you have.
        It should be read with the <Link to="/privacy">Privacy Policy</Link>.
      </p>

      <h2>What these technologies are</h2>
      <p>
        Cookies are small text files that a website places on your device. Local storage, IndexedDB and similar browser features store data in your browser in a comparable way.
        They are used to remember choices, make sites work, and (for advertising) to recognize a browser over time.
      </p>

      <h2>What Foldline itself stores</h2>
      <p>Foldline does not use its own cookies to track you and has no accounts or analytics of its own. It stores only the following on your device:</p>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr><th>Name</th><th>Purpose</th><th>Type</th></tr>
          </thead>
          <tbody>
            <tr><td><code>foldline-theme</code></td><td>Remembers your Light or Dark theme choice</td><td>Local storage, essential preference</td></tr>
            <tr><td><code>foldline-auto-name</code></td><td>Remembers whether downloads are named automatically</td><td>Local storage, essential preference</td></tr>
            <tr><td><code>foldline-coach-drag</code></td><td>Remembers that you have seen the page-dragging tip</td><td>Local storage, essential preference</td></tr>
            <tr><td>OCR engine and language data</td><td>Caches the text-recognition files so they download once</td><td>Browser cache / IndexedDB</td></tr>
          </tbody>
        </table>
      </div>
      <p>Your PDFs are held in memory only and are not written to cookies or local storage.</p>

      {ADSENSE_CLIENT ? (
        <>
          <h2>Advertising cookies (Google)</h2>
          <p>
            Foldline uses Google AdSense. Google and its advertising partners may set or read cookies and use other identifiers on your device to serve and measure ads, limit how
            often you see an ad, and (if you allow it) personalize ads based on your earlier visits to this and other sites. These may include the DoubleClick cookie and cookies
            or identifiers such as those starting with <code>__gads</code>, <code>__gpi</code> and <code>IDE</code>. Their names, lifetimes and purposes are controlled by Google and may change.
            See <Ext href="https://policies.google.com/technologies/cookies">how Google uses cookies</Ext>.
          </p>
          <p>
            Visitors in the EEA, UK and Switzerland are asked for consent before personalized advertising cookies are used.
          </p>
          <p>
            <button type="button" className="btn" onClick={openPrivacySettings}>Change ad privacy settings</button>
          </p>
        </>
      ) : null}

      <h2>Managing your choices</h2>
      <ul>
        {ADSENSE_CLIENT && (
          <>
            <li>Use the Ad privacy settings link in the footer (shown where a consent message applies) to review or change your consent.</li>
            <li>Turn off personalized ads at <Ext href="https://adssettings.google.com">adssettings.google.com</Ext> or visit <Ext href="https://www.aboutads.info/choices/">aboutads.info</Ext> and <Ext href="https://www.youronlinechoices.com/">youronlinechoices.com</Ext>.</li>
          </>
        )}
        <li>
          Most browsers let you view, block or delete cookies and site data. See your browser’s help pages, for example for{' '}
          <Ext href="https://support.google.com/chrome/answer/95647">Chrome</Ext>, <Ext href="https://support.mozilla.org/kb/clear-cookies-and-site-data-firefox">Firefox</Ext>,{' '}
          <Ext href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac">Safari</Ext> and <Ext href="https://support.microsoft.com/microsoft-edge">Edge</Ext>.
        </li>
        <li>Blocking essential preferences will not stop the tools from working, but Foldline will forget your theme and other settings between visits.</li>
        <li>Some browsers send a Global Privacy Control or Do Not Track signal. We honor your browser’s choices where we can, but third-party advertising partners handle such signals under their own policies.</li>
      </ul>

      <h2>Changes</h2>
      <p>We will update the date above if this policy changes.</p>

      <h2>Contact</h2>
      <p>Questions about cookies can be sent to <Mail />.</p>
      <Related current="/cookies" />
    </Page>
  );
}

/* --------------------------------------------------------------- Disclaimer */

export function Disclaimer() {
  return (
    <Page>
      <h1>Disclaimer</h1>
      <Meta />

      <h2>General information and tools</h2>
      <p>
        Foldline is a free utility and its tools and page content are provided for general use and information only. Although we work to make the tools reliable, we make no promise that they are
        complete, accurate, suitable for your purpose, or error-free.
      </p>

      <h2>Check your results</h2>
      <p>
        PDF processing can change a document in ways you may not expect, especially with damaged, unusual or very large files. Compression can reduce image quality, cropping hides or removes visible content,
        and OCR can misread text, particularly in poor scans. Always review the finished file and keep the original before you rely on, share or submit it.
      </p>

      <h2>Not professional advice</h2>
      <p>
        Nothing on this website is legal, financial, medical or other professional advice. Foldline is not a document certification, archival, redaction or digital signature service. Do not
        assume a cropped or protected file is securely redacted, or that password protection makes a file safe for any purpose; for confidential or legally important documents,
        use tools and services designed for that purpose and verify the output.
      </p>

      <h2>Password tools</h2>
      <p>
        The tools that add or remove passwords work only on files you are allowed to use and only when you know the password. Foldline cannot recover lost passwords, and
        we are not responsible for files that become inaccessible because a password was lost.
      </p>

      <h2>Your data and responsibility</h2>
      <p>
        Your files are processed on your device. You are responsible for backing them up and for ensuring you have the right to modify them. We are not liable for lost, corrupted or altered files.
      </p>

      <h2>External links and advertising</h2>
      <p>
        {ADSENSE_CLIENT
          ? 'Foldline displays ads served by Google AdSense and may link to other websites. We do not control, endorse or take responsibility for third-party ads, sites, products or services, and their appearance on Foldline is not a recommendation. '
          : 'Foldline may link to other websites. We do not control or endorse them and are not responsible for their content. '}
        Open-source software and third-party services used by Foldline are covered by their own licenses and terms.
      </p>

      <h2>Limitation</h2>
      <p>
        Use of this website and its tools is at your own risk. See the <Link to="/terms">Terms and Conditions</Link> for the full warranty disclaimer and limitation of liability.
      </p>

      <h2>Contact</h2>
      <p>Questions about this disclaimer can be sent to <Mail />.</p>
      <Related current="/disclaimer" />
    </Page>
  );
}
