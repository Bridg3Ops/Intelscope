    const feedUrl = 'https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json';
    const filters = document.querySelector('#filters');
    const search = document.querySelector('#search');
    const vendor = document.querySelector('#vendor');
    const ransomware = document.querySelector('#ransomware');
    const results = document.querySelector('#results');
    const status = document.querySelector('#status');
    const more = document.querySelector('#more');
    const refresh = document.querySelector('#refresh');
    let entries = [];
    let matches = [];
    let visibleCount = 12;

    function element(tag, className, text) {
      const node = document.createElement(tag);
      node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    function render() {
      results.replaceChildren();
      matches.slice(0, visibleCount).forEach(item => {
        const column = element('div', 'col-12 col-lg-6');
        const card = element('article', 'card h-100 p-4');
        card.append(element('p', 'small text-info fw-semibold', item.cveID));
        card.append(element('h3', 'h5', item.vulnerabilityName));
        card.append(element('p', 'small text-body-secondary', `${item.vendorProject} · ${item.product} · Added ${item.dateAdded}`));
        card.append(element('p', 'description', item.shortDescription));
        card.append(element('p', 'small fw-semibold', `Ransomware campaign use: ${item.knownRansomwareCampaignUse || 'Unknown'}`));
        const details = element('details', 'mb-3');
        details.append(element('summary', 'fw-semibold', 'CISA recommended action'));
        details.append(element('p', 'small mt-2', item.requiredAction));
        card.append(details);
        const link = element('a', 'mt-auto', `View ${item.cveID} on NVD`);
        link.href = `https://nvd.nist.gov/vuln/detail/${encodeURIComponent(item.cveID)}`;
        card.append(link);
        column.append(card);
        results.append(column);
      });
      const shown = Math.min(visibleCount, matches.length);
      status.textContent = matches.length ? `Showing ${shown} of ${matches.length} matching vulnerabilities, newest catalogue additions first.` : 'No matching vulnerabilities. Try a different keyword or clear the filters.';
      more.hidden = shown >= matches.length;
      if (window.jQuery) $('.description').toggle($('#descriptions').attr('aria-pressed') === 'true');
    }

    function applyFilters() {
      const query = search.value.trim().toLowerCase();
      matches = entries.filter(item => {
        const text = `${item.cveID} ${item.vendorProject} ${item.product} ${item.vulnerabilityName} ${item.shortDescription}`.toLowerCase();
        return text.includes(query) && (!vendor.value || item.vendorProject === vendor.value) &&
          (!ransomware.value || item.knownRansomwareCampaignUse === ransomware.value);
      });
      visibleCount = 12;
      render();
    }

    async function loadFeed() {
      refresh.disabled = true;
      results.setAttribute('aria-busy', 'true');
      status.textContent = 'Loading the CISA feed…';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(feedUrl, { signal: controller.signal, cache: 'no-cache' });
        if (!response.ok) throw new Error('Feed request failed');
        const data = await response.json();
        if (!Array.isArray(data.vulnerabilities)) throw new Error('Invalid feed format');
        entries = data.vulnerabilities.filter(item => typeof item.cveID === 'string' && typeof item.dateAdded === 'string')
          .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded) || a.cveID.localeCompare(b.cveID));
        document.querySelector('#total').textContent = entries.length.toLocaleString();
        document.querySelector('#ransomware-count').textContent = entries.filter(item => item.knownRansomwareCampaignUse === 'Known').length.toLocaleString();
        document.querySelector('#released').textContent = typeof data.dateReleased === 'string' ? data.dateReleased.slice(0, 10) : 'Not provided';
        const previousVendor = vendor.value;
        vendor.replaceChildren(new Option('All vendors', ''));
        [...new Set(entries.map(item => item.vendorProject).filter(Boolean))].sort().forEach(name => vendor.add(new Option(name, name)));
        if ([...vendor.options].some(option => option.value === previousVendor)) vendor.value = previousVendor;
        applyFilters();
      } catch (error) {
        status.textContent = entries.length ? 'Refresh failed. The previously loaded results remain available. Select Refresh feed to try again.' : 'Unable to load the feed. Check your connection and select Refresh feed to try again.';
      } finally {
        clearTimeout(timeout);
        refresh.disabled = false;
        results.setAttribute('aria-busy', 'false');
      }
    }

    filters.addEventListener('submit', event => { event.preventDefault(); applyFilters(); });
    filters.addEventListener('reset', () => { search.value = ''; vendor.value = ''; ransomware.value = ''; applyFilters(); });
    more.addEventListener('click', () => { visibleCount += 12; render(); });
    refresh.addEventListener('click', loadFeed);
    loadFeed();

    if (window.jQuery) {
      $('#descriptions').prop('hidden', false).on('click', function () {
        const show = $(this).attr('aria-pressed') !== 'true';
        $(this).attr('aria-pressed', String(show)).text(show ? 'Hide descriptions' : 'Show descriptions');
        const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 180;
        $('.description').stop(true, true);
        if (show) $('.description').fadeIn(duration);
        else $('.description').fadeOut(duration);
      });
    }
