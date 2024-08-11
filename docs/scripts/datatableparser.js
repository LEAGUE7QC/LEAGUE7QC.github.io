function loadCSVData(filePath, containerId, options) {
  Papa.parse(filePath, {
    download: true,
    header: true,
    complete: function(results) {
      const data = results.data;
      const table = document.createElement('table');
      table.classList.add('table', 'display'); // 'display' class for DataTables

      // Create table header
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      Object.keys(data[0]).forEach(key => {
        const th = document.createElement('th');
        th.innerText = key;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);

      // Create table body
      const tbody = document.createElement('tbody');
      data.forEach(row => {
        const tr = document.createElement('tr');
        Object.values(row).forEach(value => {
          const td = document.createElement('td');
          td.innerText = value;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);

      document.getElementById(containerId).appendChild(table);

      // Initialize DataTables with custom options
      $(document).ready(function() {
        $(table).DataTable(options);
      });
    }
  });
}
