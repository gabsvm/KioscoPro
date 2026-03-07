from http.server import BaseHTTPRequestHandler
import json
import os
import tempfile
import traceback
import sys
import datetime

import cryptography
import OpenSSL
from pyafipws.wsaa import WSAA
from pyafipws.wsfev1 import WSFEv1

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
            url_wsaa = "https://wsaa.afip.gov.ar/ws/services/LoginCms?wsdl" if is_prod else "https://wsaahomo.afip.gov.ar/ws/services/LoginCms?wsdl"
            url_wsfev1 = "https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL" if is_prod else "https://wswhomo.afip.gov.ar/wsfev1/service.asmx?WSDL"
            cuit = afip_config.get('cuit')
            
            tmp_dir = tempfile.gettempdir()
            cert_path = os.path.join(tmp_dir, 'afip.crt')
            key_path = os.path.join(tmp_dir, 'afip.key')
            
            with open(cert_path, 'w') as f:
                f.write(afip_config.get('cert', ''))
            with open(key_path, 'w') as f:
                f.write(afip_config.get('privateKey', ''))
                
            cache_dir = tmp_dir
            
            # Auth WSAA
            wsaa = WSAA()
            ta = wsaa.Autenticar("wsfe", cert_path, key_path, url_wsaa, cache_dir, debug=False)
            
            # Connect WSFEv1
            wsfev1 = WSFEv1()
            wsfev1.Cuit = cuit
            wsfev1.SetTicketAcceso(ta)
            wsfev1.Conectar(cache_dir, url_wsfev1)
            
            # Form invoice data
            punto_vta = int(profile.get('posNumber', 1))
            tipo_cbte = 6  # Factura B
            
            # Autonumerar
            ult = wsfev1.CompUltimoAutorizado(tipo_cbte, punto_vta)
            cbte_nro = int(ult) + 1 if ult else 1
            
            fecha_cbte = datetime.datetime.now().strftime("%Y%m%d")
            total_amount = float(sale.get('totalAmount', 0))
            
            # Assuming 21% IVA logic similar to node.js implementation
            imp_neto = round(total_amount / 1.21, 2)
            imp_iva = round(total_amount - imp_neto, 2)
            # Correct rounding to ensure imp_neto + imp_iva == total_amount
            imp_neto = round(total_amount - imp_iva, 2)
            
            # Prepare invoice
            wsfev1.CrearFactura(
                concepto=1,
                tipo_doc=99,
                nro_doc=0,
                tipo_cbte=tipo_cbte,
                punto_vta=punto_vta,
                cbt_desde=cbte_nro,
                cbt_hasta=cbte_nro,
                imp_total=total_amount,
                imp_tot_conc=0.00,
                imp_neto=imp_neto,
                imp_iva=imp_iva,
                imp_trib=0.00,
                imp_op_ex=0.00,
                fecha_cbte=fecha_cbte,
                moneda_id='PES',
                moneda_ctz=1.000
            )
            
            # Agregar IVA 21%
            wsfev1.AgregarIva(id=5, base_imp=imp_neto, importe=imp_iva)
            
            # Solicitar CAE
            wsfev1.CAESolicitar()
            
            if wsfev1.ErrMsg:
                raise Exception(wsfev1.ErrMsg)
                
            result = {
                "cae": wsfev1.CAE,
                "caeDueDate": wsfev1.Vencimiento,
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
