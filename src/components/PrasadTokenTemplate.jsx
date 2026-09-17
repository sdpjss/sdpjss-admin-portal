
const PrasadTokenTemplate = ({
  receiptData,
  totalWeight: totalWeightOverride,
  totalPackets: totalPacketsOverride,
}) => {
  if (!receiptData) return null;

  const { donation, user, childUser } = receiptData;
  const donorName = childUser ? childUser.fullname : user.fullname;
  const relationship = donation.relationName
    ? `W/O ${donation.relationName}`
    : childUser
      ? `${childUser.gender === "female" ? "D/O" : "S/O"} ${user.fullname}`
      : `${user.gender === "female" ? "D/O" : "S/O"} ${user.fatherName}`;
  const calculatedPackets = (donation.list || []).reduce((sum, item) => {
    return sum + (item.isPacket ? item.quantity : 0);
  }, 0);
  const totalPackets = Number.isFinite(totalPacketsOverride)
    ? totalPacketsOverride
    : calculatedPackets;

  // Define the function outside the component
  const calculatedWeight = (donation.list || []).reduce((sum, item) => {
    return sum + (item.isPacket ? 0 : item.quantity);
  }, 0);
  const totalWeightInGrams = Number.isFinite(totalWeightOverride)
    ? totalWeightOverride
    : calculatedWeight;

  // convert gm to kg and gm
  const convertGramsToKgAndGm = (totalGrams) => {
    const kg = Math.floor(totalGrams / 1000);
    const grams = totalGrams % 1000;

    if (kg > 0) {
      if (grams > 0) {
        return `${kg} kg ${grams} gm`;
      }
      return `${kg} kg`;
    }
    return `${grams} gm`;
  };

  const quantityToDisplay = (totalWeightInGrams, totalPackets) => {
    let qtyToPrint = "";
    const totalWeight = convertGramsToKgAndGm(totalWeightInGrams);
    if (totalWeightInGrams > 0) {
      qtyToPrint += totalWeight.toLocaleString("en-IN");
    }
    if (totalWeightInGrams > 0 && totalPackets > 0) {
      qtyToPrint += " and ";
    }
    if (totalPackets > 0) {
      qtyToPrint += `${totalPackets.toLocaleString("en-IN")} ${totalPackets === 1 ? "packet" : "packets"}`;
    }
    return qtyToPrint;
  };

  return (
    <>
      <style>
        {`@media print {
          body { -webkit-print-color-adjust: exact; }
          .bill-container { box-shadow: none !important; border: 1px solid #ccc !important;}
        }`}
      </style>
      <div
        style={{
          position: "absolute",
          top: "55%",
          left: "50%",
          width: "60%",
          height: "60%",
          transform: "translate(-50%, -50%)",
          backgroundImage:
            "url(https://res.cloudinary.com/needlesscat/image/upload/v1754307740/logo_unr2rc.jpg)",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center center",
          backgroundSize: "contain",
          opacity: 0.08,
          zIndex: 10,
          pointerEvents: "none",
        }}
      />
      <div
        className="bill-container"
        style={{
          maxWidth: "800px",
          margin: "auto",
          border: "1px solid #ccc",
          padding: "10px 20px",
          boxShadow: "0 0 10px rgba(0,0,0,0.1)",
          fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          color: "#333",
          position: "relative",
          backgroundColor: "white",
        }}
      >
        <div
          className="header"
          style={{
            textAlign: "center",
            borderBottom: "2px solid #d32f2f",
            paddingBottom: "10px",
            marginBottom: "10px",
          }}
        >
          <div style={{ fontSize: "12px", display: "flex", justifyContent: "space-between",}}>
            <span>
              <b>Estd. 1939</b>
            </span>
            <span>
              <b>Reg. No. 2020/272</b>
            </span>
          </div>
          <div style={{fontSize: "24px", fontWeight: "bold", color: "#d32f2f", marginBottom: "1px",}}>
            SHREE DURGAJI PATWAY JATI SUDHAR SAMITI
          </div>
          <div style={{ marginBottom: "1px", fontSize: "14px" }}>
            Shree Durga Sthan, Patwatoli, Manpur, P.O. Buniyadganj, Gaya Ji -
            823003
          </div>
          <div style={{ fontSize: "12px", color: "#444" }}>
            <strong>PAN:</strong> ABBTS1301C | <strong>Contact:</strong> 0631
            2952160, +91 9472030916 | <strong>Email:</strong>{" "}
            sdpjssmanpur@gmail.com
          </div>
        </div>
        <div style={{fontSize: "16px", fontWeight: 600, textAlign: "center", margin: "10px 0", letterSpacing: "1px",}}>
          PRASAD TOKEN
        </div>
        <div style={{display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "12px",}}>
          <div>
            <strong>Token No:</strong> <span className= "font-mono" style={{padding: "3px 0 0 8px", fontWeight: "700", color: "#d32f2f",}}>{donation.receiptId}</span>
          </div>
          <div>
            <strong>Date:</strong>{" "}
            {new Date(donation.createdAt).toLocaleDateString(
              "en-IN",
              { year: "numeric", month: "long", day: "numeric", }
            )}
          </div>
        </div>
        <div style={{backgroundColor: "#f9f9f9", padding: "10px", border: "1px dashed #ddd", borderRadius: "8px", marginBottom: "12px",}}>
          <h3 style={{marginTop: 0, color: "#d32f2f", borderBottom: "1px solid #eee", paddingBottom: "5px", fontSize: "14px", marginBottom: "8px",}}>
            Recipient Details
          </h3>
          <table>
            <tbody>
              <tr>
                <td style={{ fontSize: "12px", padding: "2px 0" }}><strong>Name</strong></td>
                <td style={{ fontSize: "12px", padding: "2px 2px" }}><strong>:</strong></td>
                <td style={{ fontSize: "12px", padding: "2px 10px" }}>{donorName} {relationship}</td>
              </tr>
              <tr>
                <td style={{ fontSize: "12px", padding: "2px 0" }}><strong>Address</strong></td>
                <td style={{ fontSize: "12px", padding: "2px 2px" }}><strong>:</strong></td>
                <td style={{ fontSize: "12px", padding: "2px 10px" }}>
                  {donation.donatedAs === "child" ||
                  donation.postalAddress === "Will collect from Durga Sthan" ||
                    !donation.postalAddress ? (
                      <>
                        {user.address?.room ? `Room-${user.address.room}, ` : ""}
                        {user.address?.floor ? `Floor-${user.address.floor}, ` : ""}
                        {user.address?.apartment ? `${user.address.apartment}, ` : ""}
                        {user.address?.landmark ? `${user.address.landmark}, ` : ""}
                        {user.address?.street ? `${user.address.street}, ` : ""}
                        {user.address?.postoffice
                          ? `PO: ${user.address.postoffice}, `
                          : ""}
                        {user.address?.city ? `${user.address.city}, ` : ""}
                        {user.address?.district ? `${user.address.district}, ` : ""}
                        {user.address?.state ? `${user.address.state}, ` : ""}
                        {user.address?.country ? `${user.address.country} ` : ""}
                        {user.address?.pin ? `- ${user.address.pin}` : ""}
                      </>
                    ) : (
                      donation.postalAddress
                    )}
                </td>
              </tr>
              <tr>
                <td style={{ fontSize: "12px", padding: "2px 0" }}><strong>Mobile</strong></td>
                <td style={{ fontSize: "12px", padding: "2px 2px" }}><strong>:</strong></td>
                <td style={{ fontSize: "12px", padding: "2px 10px" }}>
                  {user.contact?.mobileno?.code}{"-"}{user.contact?.mobileno?.number}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{backgroundColor: "#f9f9f9", padding: "10px", border: "1px dashed #ddd", borderRadius: "8px", marginBottom: "12px",}}>
          <h3 style={{marginTop: 0, color: "#d32f2f", borderBottom: "1px solid #eee", paddingBottom: "5px", fontSize: "14px", marginBottom: "8px",}}>
            Mahaprasad Details
          </h3>
          <table>
            <tbody>
              <tr>
                <td style={{ fontSize: "12px", padding: "2px 0" }}><strong>Quantity</strong></td>
                <td style={{ fontSize: "12px", padding: "2px 2px" }}><strong>:</strong></td>
                <td style={{ fontSize: "12px", padding: "2px 10px", fontWeight: "700", color: "#d32f2f", }}>
                  {quantityToDisplay(totalWeightInGrams, totalPackets)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{backgroundColor: "#f9f9f9", padding: "10px", border: "1px dashed #ddd", borderRadius: "8px", marginBottom: "12px",}}>
          <h3 style={{marginTop: 0, color: "#d32f2f", borderBottom: "1px solid #eee", paddingBottom: "5px", fontSize: "14px", marginBottom: "8px",}}>
            Collection Details
          </h3>
          <table>
            <tbody>
              <tr>
                <td style={{ fontSize: "12px", padding: "2px 0" }}><strong>Date</strong></td>
                <td style={{ fontSize: "12px", padding: "2px 2px" }}><strong>:</strong></td>
                <td style={{ fontSize: "12px", padding: "2px 10px", fontWeight: "700", color: "#d32f2f", }}>
                  {import.meta.env.VITE_MAHA_PRASAD_COLLECTION_DATE}
                </td>
              </tr>
              <tr>
                <td style={{ fontSize: "12px", padding: "2px 0" }}><strong>Time</strong></td>
                <td style={{ fontSize: "12px", padding: "2px 2px" }}><strong>:</strong></td>
                <td style={{ fontSize: "12px", padding: "2px 10px" }}>
                  {import.meta.env.VITE_MAHA_PRASAD_COLLECTION_TIME}
                </td>
              </tr>
              <tr>
                <td style={{ fontSize: "12px", padding: "2px 0" }}><strong>Location</strong></td>
                <td style={{ fontSize: "12px", padding: "2px 2px" }}><strong>:</strong></td>
                <td style={{ fontSize: "12px", padding: "2px 10px" }}>
                  {import.meta.env.VITE_MAHA_PRASAD_COLLECTION_LOCATION}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{backgroundColor: "#f9f9f9", padding: "10px", border: "1px dashed #ddd", borderRadius: "8px", marginBottom: "12px",}}>
          <h3 style={{marginTop: 0, color: "#d32f2f", borderBottom: "1px solid #eee", paddingBottom: "5px", fontSize: "14px", marginBottom: "8px",}}>
            Instructions
          </h3>
          <ul style={{paddingLeft: "16px", margin: 0, }}>
            <li style={{fontSize: "12px", margin: "4px 0"}}>
              <strong>#</strong> Please present this token to the volunteer at the Mahaprasad collection counter.
            </li>
            <li style={{fontSize: "12px", margin: "4px 0"}}>
              <strong>#</strong> This token is valid for a single use only.
            </li>
            <li style={{fontSize: "12px", margin: "4px 0"}}>
              <strong>#</strong> Please ensure you collect your items within the specified time to avoid any inconvenience.
            </li>
            <li style={{fontSize: "12px", margin: "4px 0"}}>
              <strong>#</strong> Distribution schedules are subject to change; please follow community announcements for updates.
            </li>
          </ul>
        </div>

        <div style={{textAlign: "center", marginTop: "1px", paddingTop: "1px", borderTop: "1px solid #ccc", fontSize: "10px", color: "#777", }}>
          <p>
            This is an electronically generated document, hence does not require signature.
          </p>
          <p style={{ fontStyle: "italic" }}>
            Generated on {new Date().toLocaleString("en-IN")}.
          </p>
        </div>
      </div>
    </>
  );
};

export default PrasadTokenTemplate;
