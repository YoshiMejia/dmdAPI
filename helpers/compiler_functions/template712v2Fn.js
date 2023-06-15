const template712v2Fn = (row, template) => {
  const borrower_first_name = row.borrower_first_name || 'nfn';
  const borrower_last_name = row.borrower_last_name || 'nln';
  const borrower_address_1 = row.borrower_address_1 || 'no address';
  const borrower_address_2 = row.borrower_address_2 || 'no address';
  const borrower_city = row.borrower_city || 'no city';
  const borrower_state = row.borrower_state || 'no state';
  const borrower_postal_code = row.borrower_postal_code || 'no postal code';
  const branch_address_1 = row.branch_address_1 || 'no branch address';
  const branch_address_2 = row.branch_address_2 || 'no branch address';
  const branch_city = row.branch_city || 'no branch city';
  const branch_state = row.branch_state || 'no branch state';
  const branch_postal_code = row.branch_postal_code || 'no branch postal code';
  const branch_phone = row.branch_phone || 'no branch phone';
  const letter_date = row.letter_date || 'no letter date';
  const loan_total_amount_due = row.loan_total_amount_due || 'no loan amount';
  const branch_manager_name =
    row.branch_manager_name || 'no branch manager name';
  const current_year = new Date().getFullYear();
  const html = template({
    borrower_first_name,
    borrower_last_name,
    borrower_address_1,
    borrower_address_2,
    borrower_city,
    borrower_state,
    borrower_postal_code,
    branch_address_1,
    branch_address_2,
    branch_city,
    branch_state,
    branch_postal_code,
    branch_phone,
    letter_date,
    loan_total_amount_due,
    branch_manager_name,
    current_year,
  });
  return html;
};

module.exports = template712v2Fn;
