from http.server import BaseHTTPRequestHandler
import json
import os
import tempfile
import traceback
import datetime
from afip import Afip

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            
            data = json.loads(post_data.decode('utf-8'))
            sale = data.get('sale')
            profile = data.get('profile')
            
            if not sale or not profile:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"message": "Missing sale or profile data"}')
                return
            
            afip_config = profile.get('afipConfig')
            if not afip_config:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"message": "Missing AFIP config"}')
                return
            
            is_prod = afip_config.get('environment') == 'production'
            cuit = afip_config.get('cuit')
            
            tmp_dir = tempfile.gettempdir()
            cert_path = os.path.join(tmp_dir, 'afip.crt')
            key_path = os.path.join(tmp_dir, 'afip.key')
            
            with open(cert_path, 'w') as f:
                f.write(afip_config.get('cert', ''))
            with open(key_path, 'w') as f:
                f.write(afip_config.get('privateKey', ''))
                
            afip = Afip({
                "CUIT": int(cuit),
                "cert": cert_path,
                "key": key_path,
                "production": is_prod,
                "res_folder": tmp_dir,
                "ta_folder": tmp_dir
            })
            
            punto_vta = int(profile.get('posNumber', 1))
            tipo_cbte = 6  # Factura B
            
            # Obtener el ultimo comprobante
            last_voucher = afip.ElectronicBilling.getLastVoucher(punto_vta, tipo_cbte)
            cbte_nro = last_voucher + 1
            
            total_amount = float(sale.get('totalAmount', 0))
            
            # Calculo basico de IVA 21%
            imp_neto = round(total_amount / 1.21, 2)
            imp_iva = round(total_amount - imp_neto, 2)
            # Aseguro el total_amount
            imp_neto = round(total_amount - imp_iva, 2)
            
            fecha = datetime.datetime.now().strftime("%Y%m%d")

            invoice_data = {
	            'CantReg' 	: 1,  # Cantidad de facturas a registrar
	            'PtoVta' 	: punto_vta,  # Punto de venta
	            'CbteTipo' 	: tipo_cbte,  # 6 = Factura B
	            'Concepto' 	: 1,  # 1 = Productos
	            'DocTipo' 	: 99, # 99 = Consumidor Final
	            'DocNro' 	: 0,
	            'CbteDesde' : cbte_nro,
	            'CbteHasta' : cbte_nro,
	            'CbteFch' 	: int(fecha),
	            'ImpTotal' 	: total_amount,
	            'ImpTotConc': 0, # Neto no gravado
	            'ImpNeto' 	: imp_neto,
	            'ImpOpEx' 	: 0,
	            'ImpIVA' 	: imp_iva,
	            'ImpTrib' 	: 0,
	            'MonId' 	: 'PES', # Pesos
	            'MonCotiz' 	: 1, # Cotizacion
               'Iva'       : [{ # Alícuota de IVA
                    'Id'      : 5, # 5 = 21%
                    'BaseImp' : imp_neto,
                    'Importe' : imp_iva
                }]
            }
            
            res = afip.ElectronicBilling.createVoucher(invoice_data)
            
            result = {
                "cae": res['CAE'],
                "caeDueDate": res['CAEFchVto'],
                "voucherNumber": cbte_nro
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode('utf-8'))
            
        except Exception as e:
            err_msg = str(e)
            trace = traceback.format_exc()
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"message": "Failed to generate electronic invoice", "error": err_msg, "trace": trace}).encode('utf-8'))
        return
