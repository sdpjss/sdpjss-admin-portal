const waitForStylesheet = (link, printWindow) =>
  new Promise((resolve) => {
    const timeout = printWindow.setTimeout(resolve, 1000);
    const finish = () => {
      printWindow.clearTimeout(timeout);
      resolve();
    };

    link.addEventListener("load", finish, { once: true });
    link.addEventListener("error", finish, { once: true });
  });

export const printElements = async ({
  elements,
  title,
  printStyles = "",
  separatePages = false,
}) => {
  const nodes = (Array.isArray(elements) ? elements : [elements]).filter(Boolean);
  if (nodes.length === 0) return false;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return false;

  printWindow.opener = null;
  const printDocument = printWindow.document;
  printDocument.title = String(title || "Print");

  const stylesheetPromises = [];
  document.querySelectorAll('link[rel="stylesheet"], style').forEach((source) => {
    const copy = source.cloneNode(true);
    printDocument.head.appendChild(copy);
    if (copy.tagName === "LINK") {
      stylesheetPromises.push(waitForStylesheet(copy, printWindow));
    }
  });

  if (printStyles) {
    const style = printDocument.createElement("style");
    style.textContent = printStyles;
    printDocument.head.appendChild(style);
  }

  nodes.forEach((node, index) => {
    printDocument.body.appendChild(node.cloneNode(true));
    if (separatePages && index < nodes.length - 1) {
      const pageBreak = printDocument.createElement("div");
      pageBreak.style.breakAfter = "page";
      pageBreak.style.pageBreakAfter = "always";
      printDocument.body.appendChild(pageBreak);
    }
  });

  await Promise.all(stylesheetPromises);
  printWindow.focus();
  printWindow.print();
  printWindow.close();
  return true;
};
