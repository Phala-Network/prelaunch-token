package io.daonomic.trezor;

import javax.swing.*;

public class AskPassphrase {
    public static void main(String[] args) {
        Box box = Box.createHorizontalBox();

        JLabel jl = new JLabel("Passphrase: ");
        box.add(jl);

        JPasswordField jpf = new JPasswordField(24);
        box.add(jpf);

        int button = JOptionPane.showConfirmDialog(null, box, "Enter passphrase", JOptionPane.OK_CANCEL_OPTION);

        if (button == JOptionPane.OK_OPTION) {
            System.out.println(new String(jpf.getPassword()));
        } else {
            System.err.println("Cancelled");
            System.exit(1);
        }
    }
}
