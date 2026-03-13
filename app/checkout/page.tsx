'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../components/layout/DashboardLayout';
import { CreditCard, Truck, MapPin, CheckCircle, Shield, Loader2, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { getCart, type CartSummary } from '@/services/cartService';
import { createSalesOrder } from '@/services/salesService';

const shippingOptions = [
  { key: 'standard', days: '5-7', cost: 9.99 },
  { key: 'express', days: '2-3', cost: 19.99 },
  { key: 'next_day', days: '1', cost: 29.99 },
] as const;

type ShippingKey = (typeof shippingOptions)[number]['key'];

const emptyCart: CartSummary = {
  items: [],
  total_items: 0,
  subtotal: 0,
  total: 0,
};

export default function CheckoutPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const [cart, setCart] = useState<CartSummary>(emptyCart);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [shippingMethod, setShippingMethod] = useState<ShippingKey>('standard');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');

  const loadCart = useCallback(async () => {
    setError('');
    try {
      const payload = await getCart();
      setCart(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cart');
      setCart(emptyCart);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      await loadCart();
      setLoading(false);
    };

    void bootstrap();
  }, [loadCart]);

  const shipping = useMemo(
    () => shippingOptions.find((option) => option.key === shippingMethod)?.cost ?? 0,
    [shippingMethod]
  );

  const subtotal = cart.subtotal || cart.total;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  const isAddressValid =
    fullName.trim().length > 0 &&
    address.trim().length > 0 &&
    city.trim().length > 0 &&
    zipCode.trim().length > 0 &&
    phone.trim().length > 0;

  const isPaymentValid =
    cardNumber.replace(/\s+/g, '').length >= 12 &&
    expiryDate.trim().length >= 4 &&
    cvv.trim().length >= 3 &&
    cardHolderName.trim().length > 0;

  const canSubmit = cart.items.length > 0 && isAddressValid && isPaymentValid && !submitting;

  const handlePlaceOrder = async () => {
    if (!canSubmit) return;

    setSubmitting(true);
    setError('');

    try {
      const payload = await createSalesOrder({
        customer_name: fullName.trim(),
        phone: phone.trim(),
        shipping_address: {
          address: address.trim(),
          city: city.trim(),
          postal_code: zipCode.trim(),
        },
        billing_address: {
          address: address.trim(),
          city: city.trim(),
          postal_code: zipCode.trim(),
        },
        payment_method: 'card',
        payment_reference: `****${cardNumber.replace(/\s+/g, '').slice(-4)}`,
        shipping_cost: shipping,
        tax,
        total,
        items: cart.items.map((item) => ({
          product: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      });

      if (payload.id) {
        router.push(`/orders/${payload.id}`);
        return;
      }

      router.push('/orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('pages.checkout.title')}</h1>
        <p className="text-gray-600">{t('pages.checkout.subtitle')}</p>
      </div>

      {error ? (
        <div className="mb-4 flex items-center gap-2 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2 text-gray-400" />
              {t('pages.checkout.shippingAddress')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.checkout.fullName')}</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.checkout.address')}</label>
                <input
                  type="text"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="123 Main Street"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.checkout.city')}</label>
                <input
                  type="text"
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="New York"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.checkout.zipCode')}</label>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(event) => setZipCode(event.target.value)}
                  placeholder="10001"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.checkout.phone')}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+1 234-567-8901"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Truck className="w-5 h-5 mr-2 text-gray-400" />
              {t('pages.checkout.shippingMethod')}
            </h3>
            <div className="space-y-3">
              {shippingOptions.map((option) => (
                <label
                  key={option.key}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-500"
                >
                  <div className="flex items-center">
                    <input
                      type="radio"
                      name="shipping"
                      checked={shippingMethod === option.key}
                      onChange={() => setShippingMethod(option.key)}
                      className="mr-3"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {option.key === 'standard'
                          ? t('pages.checkout.standardShipping')
                          : option.key === 'express'
                            ? t('pages.checkout.expressShipping')
                            : t('pages.checkout.nextDayDelivery')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {option.days === '1' ? t('pages.checkout.tomorrow') : option.days} {t('pages.checkout.deliveryDays')}
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold text-gray-900">${option.cost.toFixed(2)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-gray-400" />
              {t('pages.checkout.paymentMethod')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.checkout.cardNumber')}</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(event) => setCardNumber(event.target.value)}
                  placeholder="1234 5678 9012 3456"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.checkout.expiryDate')}</label>
                  <input
                    type="text"
                    value={expiryDate}
                    onChange={(event) => setExpiryDate(event.target.value)}
                    placeholder="MM/YY"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.checkout.cvv')}</label>
                  <input
                    type="text"
                    value={cvv}
                    onChange={(event) => setCvv(event.target.value)}
                    placeholder="123"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('pages.checkout.nameOnCard')}</label>
                <input
                  type="text"
                  value={cardHolderName}
                  onChange={(event) => setCardHolderName(event.target.value)}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center text-green-600 text-sm">
              <Shield className="w-4 h-4 mr-1" />
              {t('pages.checkout.securePayment')}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('pages.checkout.orderSummary')}</h3>

            {loading ? (
              <div className="py-6 flex items-center justify-center gap-2 text-gray-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.name} × {item.quantity}</span>
                      <span className="font-medium text-gray-900">${item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                  {cart.items.length === 0 ? (
                    <p className="text-sm text-gray-500">{t('common.noResults')}</p>
                  ) : null}
                </div>
                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex justify-between text-gray-600"><span>{t('pages.checkout.subtotal')}</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>{t('pages.checkout.shipping')}</span><span>${shipping.toFixed(2)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>{t('pages.checkout.tax')}</span><span>${tax.toFixed(2)}</span></div>
                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between text-lg font-semibold text-gray-900"><span>{t('pages.checkout.total')}</span><span>${total.toFixed(2)}</span></div>
                  </div>
                </div>
              </>
            )}

            <button
              onClick={() => void handlePlaceOrder()}
              disabled={!canSubmit}
              className="mt-6 w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {t('common.placeOrder')}
            </button>

            <div className="mt-4 space-y-2">
              <div className="flex items-center text-green-600 text-sm"><CheckCircle className="w-4 h-4 mr-2" />{t('pages.invoice.freeReturns')}</div>
              <div className="flex items-center text-green-600 text-sm"><CheckCircle className="w-4 h-4 mr-2" />{t('pages.invoice.securePayment')}</div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
