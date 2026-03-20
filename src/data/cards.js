// Transfer ratios for Indian credit cards
// Last updated: 2026-03-17
// Format: { a: display name, r: "card_pts:miles" ratio, p: program_id from programs.js }
// To update: edit ratios below and change CARDS_LAST_UPDATED date

export const CARDS_LAST_UPDATED = "2026-03-17";

export const CARDS = [
  {id:"axis_atlas",name:"Axis Atlas",color:"#6B2D8B",tp:[{a:"Flying Blue",r:"1:2",p:"flying_blue"},{a:"KrisFlyer",r:"1:2",p:"krisflyer"},{a:"Miles&Smiles",r:"1:2",p:"miles_smiles"},{a:"Etihad Guest",r:"1:2",p:"etihad_guest"},{a:"Club Vistara",r:"1:1",p:"club_vistara"},{a:"Flying Returns",r:"1:1",p:"flying_returns"},{a:"LifeMiles",r:"1:2",p:"lifemiles"}]},
  {id:"axis_magnus",name:"Axis Magnus",color:"#1A1A2E",tp:[{a:"Flying Blue",r:"5:2",p:"flying_blue"},{a:"KrisFlyer",r:"5:2",p:"krisflyer"},{a:"Miles&Smiles",r:"5:2",p:"miles_smiles"},{a:"Club Vistara",r:"5:4",p:"club_vistara"}]},
  {id:"axis_burg",name:"Axis Burgundy",color:"#800020",tp:[{a:"Flying Blue",r:"2:1",p:"flying_blue"},{a:"KrisFlyer",r:"2:1",p:"krisflyer"},{a:"Miles&Smiles",r:"2:1",p:"miles_smiles"},{a:"Etihad Guest",r:"2:1",p:"etihad_guest"}]},
  {id:"icici_epm",name:"ICICI Emeralde",color:"#004D40",tp:[{a:"KrisFlyer",r:"2:1",p:"krisflyer"},{a:"Etihad Guest",r:"2:1",p:"etihad_guest"},{a:"Avios",r:"2:1",p:"avios_ba"},{a:"InterMiles",r:"1:1",p:"intermiles"}]},
  {id:"icici_tb",name:"ICICI Times Black",color:"#212121",tp:[{a:"InterMiles",r:"4:1",p:"intermiles"},{a:"Club Vistara",r:"4:1",p:"club_vistara"},{a:"Flying Returns",r:"4:1",p:"flying_returns"}]},
  {id:"hsbc",name:"HSBC Premier",color:"#DB0011",tp:[{a:"KrisFlyer",r:"1:1",p:"krisflyer"},{a:"Avios",r:"1:1",p:"avios_ba"},{a:"InterMiles",r:"1:1",p:"intermiles"},{a:"Flying Returns",r:"1:1",p:"flying_returns"}]},
  {id:"amex_pt",name:"Amex Plat Travel",color:"#006FCF",tp:[{a:"Avios",r:"2:1",p:"avios_ba"},{a:"KrisFlyer",r:"2:1",p:"krisflyer"},{a:"Asia Miles",r:"2:1",p:"asia_miles"},{a:"Skywards",r:"2:1",p:"skywards"},{a:"Etihad Guest",r:"2:1",p:"etihad_guest"},{a:"InterMiles",r:"2:1",p:"intermiles"},{a:"Flying Returns",r:"2:1",p:"flying_returns"},{a:"LifeMiles",r:"2:1",p:"lifemiles"},{a:"Aeroplan",r:"2:1",p:"aeroplan"}]},
  {id:"amex_mr",name:"Amex MRCC",color:"#0077C8",tp:[{a:"Avios",r:"1:1",p:"avios_ba"},{a:"KrisFlyer",r:"1:1",p:"krisflyer"},{a:"Asia Miles",r:"1:1",p:"asia_miles"},{a:"Skywards",r:"1:1",p:"skywards"},{a:"Etihad Guest",r:"1:1",p:"etihad_guest"},{a:"InterMiles",r:"1:1",p:"intermiles"},{a:"LifeMiles",r:"1:1",p:"lifemiles"},{a:"Aeroplan",r:"1:1",p:"aeroplan"}]},
  {id:"hdfc_inf",name:"HDFC Infinia",color:"#004C8F",tp:[{a:"KrisFlyer",r:"1:1",p:"krisflyer"},{a:"InterMiles",r:"1:1",p:"intermiles"},{a:"Flying Returns",r:"1:1",p:"flying_returns"},{a:"Avios",r:"1:1",p:"avios_ba"},{a:"Aeroplan",r:"1:1",p:"aeroplan"}]},
  {id:"hdfc_dcb",name:"HDFC Diners Black",color:"#1B1B3A",tp:[{a:"KrisFlyer",r:"1:1",p:"krisflyer"},{a:"InterMiles",r:"1:1",p:"intermiles"},{a:"Flying Returns",r:"1:1",p:"flying_returns"},{a:"Aeroplan",r:"1:1",p:"aeroplan"}]},
  {id:"sbi",name:"SBI Elite",color:"#1F4E9E",tp:[{a:"Club Vistara",r:"2:1",p:"club_vistara"},{a:"Flying Returns",r:"2:1",p:"flying_returns"}]},
  {id:"marriott",name:"Marriott Bonvoy",color:"#862633",tp:[{a:"Flying Blue",r:"3:1",p:"flying_blue"},{a:"Avios",r:"3:1",p:"avios_ba"},{a:"Skywards",r:"3:1",p:"skywards"},{a:"KrisFlyer",r:"3:1",p:"krisflyer"},{a:"Miles&Smiles",r:"3:1",p:"miles_smiles"},{a:"Flying Returns",r:"3:1",p:"flying_returns"},{a:"LifeMiles",r:"3:1",p:"lifemiles"},{a:"Aeroplan",r:"3:1",p:"aeroplan"}]},
  {id:"au",name:"AU Zenith+",color:"#E8490F",tp:[{a:"InterMiles",r:"1:1",p:"intermiles"},{a:"Flying Returns",r:"2:1",p:"flying_returns"}]},
  {id:"idfc",name:"IDFC Select",color:"#7B2D8B",tp:[{a:"InterMiles",r:"1:1",p:"intermiles"},{a:"Club Vistara",r:"2:1",p:"club_vistara"}]},
];

export async function fetchCards(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch");
    return await res.json();
  } catch {
    return { cards: CARDS, lastUpdated: CARDS_LAST_UPDATED };
  }
}
